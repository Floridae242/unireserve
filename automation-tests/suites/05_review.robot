*** Settings ***
Documentation       REQ-REV-01 across Auth -> Booking -> Review.
...                 Covers TS-08 (owner review completed booking), TS-09 (non-owner review),
...                 TS-10 (duplicate review), and query endpoints.
Resource            ../resources/common.resource
Suite Setup         Review Should Be Healthy


*** Test Cases ***
TS-08 Owner Review Completed Booking
    ${room}=    Unique Id    room
    ${b_id}=    Create Booking That Ends Soon    ${ALICE}[headers]    ${room}
    Set Suite Variable    ${COMPLETED_BOOKING_ID}    ${b_id}
    Set Suite Variable    ${REVIEWED_ROOM}    ${room}
    Wait Until Keyword Succeeds    20s    500ms    Booking Status Should Be    ${b_id}    COMPLETED
    ${rev}=     Create Review    ${ALICE}[headers]    ${b_id}    ${{ 5 }}    comment=Great room!
    Should Be Equal    ${rev.json()}[review][bookingId]    ${b_id}
    Should Be Equal    ${rev.json()}[review][userId]    ${ALICE}[id]
    Should Be Equal    ${rev.json()}[review][resourceId]    ${room}
    Should Be Equal    ${rev.json()}[review][rating]    ${{ 5 }}
    Should Be Equal    ${rev.json()}[review][comment]    Great room!

TS-09 Non-Owner Review
    ${resp}=    Create Review    ${BOB}[headers]    ${COMPLETED_BOOKING_ID}    ${{ 4 }}    expected_status=403
    Should Be Equal    ${resp.json()}[error]    FORBIDDEN

TS-10 Review Booking เดิมซ้ำ
    ${resp}=    Create Review    ${ALICE}[headers]    ${COMPLETED_BOOKING_ID}    ${{ 3 }}    expected_status=409
    Should Be Equal    ${resp.json()}[error]    REVIEW_ALREADY_EXISTS

RF-REV-01 Review Uncompleted Booking Returns 409
    ${room}=    Unique Id    room
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    2030-01-01T09:00:00Z    2030-01-01T10:00:00Z
    ${id}=      Set Variable    ${resp.json()}[booking][id]
    ${fail}=    Create Review    ${ALICE}[headers]    ${id}    ${{ 5 }}    expected_status=409
    Should Be Equal    ${fail.json()}[error]    BOOKING_NOT_COMPLETED

RF-REV-02 Query Reviews For Resource And User
    ${res_reviews}=     List Reviews For Resource    ${REVIEWED_ROOM}    ${ALICE}[headers]
    Should Be True      len($res_reviews.json()['reviews']) >= 1
    Should Be Equal     ${res_reviews.json()}[reviews][0][bookingId]    ${COMPLETED_BOOKING_ID}

    ${user_reviews}=    List Reviews For User    ${ALICE}[id]    ${ALICE}[headers]
    Should Be True      len($user_reviews.json()['reviews']) >= 1
    Should Be Equal     ${user_reviews.json()}[reviews][0][bookingId]    ${COMPLETED_BOOKING_ID}

    # Other user cannot query someone else's user reviews
    ${forbidden}=       List Reviews For User    ${ALICE}[id]    ${BOB}[headers]    expected_status=403
    Should Be Equal     ${forbidden.json()}[error]    FORBIDDEN


*** Keywords ***
Create Booking That Ends Soon
    [Documentation]    Books a short slot that starts a few seconds from now, so it becomes COMPLETED quickly.
    ...                Booking rejects a start time in the past, so if a slow request lets the start pass,
    ...                recompute the times and try again instead of failing on timing.
    [Arguments]    ${headers}    ${resource_id}
    Ensure Booking Resource Exists    ${resource_id}
    FOR    ${attempt}    IN RANGE    3
        ${start}    ${end}=    Evaluate
        ...    [datetime.datetime.fromtimestamp(math.ceil(time.time()) + offset, tz=datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') for offset in (3, 4)]
        ...    modules=datetime,math,time
        ${resp}=    POST    ${BOOKING_URL}/bookings    headers=${headers}
        ...    json=${{ {'resourceId': $resource_id, 'startTime': $start, 'endTime': $end} }}    expected_status=any
        IF    $resp.status_code == 201    RETURN    ${resp.json()}[booking][id]
        Should Be Equal    ${resp.json()}[error]    INVALID_TIME_RANGE    msg=Unexpected booking error: ${resp.text}
        Log    Start time passed before Booking received the request (attempt ${attempt}); retrying    WARN
    END
    Fail    Could not create a short booking after 3 attempts

Booking Status Should Be
    [Arguments]    ${booking_id}    ${status}
    ${resp}=    Get Booking    ${booking_id}    ${ALICE}[headers]
    Should Be Equal    ${resp.json()}[booking][status]    ${status}
