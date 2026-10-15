*** Settings ***
Documentation       REQ-REV-01 across Auth -> Booking -> Review.
...                 Covers TS-08 (owner review completed booking), TS-09 (non-owner review),
...                 TS-10 (duplicate review), and query endpoints.
Resource            ../resources/common.resource
Suite Setup         Review Should Be Healthy


*** Test Cases ***
TS-08 Owner Review Completed Booking
    ${room}=    Unique Id    room
    ${now}=     Evaluate    int(__import__('time').time())
    ${start}=   Evaluate    __import__('datetime').datetime.fromtimestamp($now + 1, tz=__import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    ${end}=     Evaluate    __import__('datetime').datetime.fromtimestamp($now + 3, tz=__import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${start}    ${end}
    ${b_id}=    Set Variable    ${resp.json()}[booking][id]
    Set Suite Variable    ${COMPLETED_BOOKING_ID}    ${b_id}
    Set Suite Variable    ${REVIEWED_ROOM}    ${room}
    Sleep       4s
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
