*** Settings ***
Documentation       REQ-BOOK-01, REQ-BOOK-02 and REQ-NOTI-01 across Auth -> Resource -> Booking -> Notification.
...                 Resource is a stub (automation-tests/stubs) until member3 ships; each test uses its own
...                 resource id so time slots never collide between tests or repeated runs.
...                 RF-BOOK-06..08 (TS-BOOK-09) use extra Booking instances from compose.yaml wired to a failing,
...                 unreachable or misconfigured Notification: the booking must still be saved.
Resource            ../resources/common.resource
Suite Setup         Booking Should Be Healthy


*** Variables ***
${T09}      2030-01-01T09:00:00Z
${T10}      2030-01-01T10:00:00Z
${T0930}    2030-01-01T09:30:00Z
${T1030}    2030-01-01T10:30:00Z
${T11}      2030-01-01T11:00:00Z


*** Test Cases ***
TS-04 Booking A Free Slot Creates A Linked Notification
    ${room}=    Unique Id    room
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}
    ${booking}=    Set Variable    ${resp.json()}[booking]
    Should Be Equal    ${booking}[status]    CONFIRMED
    Should Be Equal    ${booking}[userId]    ${ALICE}[id]
    Should Be True    ${resp.json()}[notificationSent]
    ${types}=    Notification Types For Booking    ${ALICE}    ${booking}[id]
    Should Be Equal    ${types}    ${{ ['BOOKING_CREATED'] }}

TS-05 Overlapping Booking On Same Resource Returns 409
    ${room}=    Unique Id    room
    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}
    ${resp}=    Create Booking    ${BOB}[headers]    ${room}    ${T0930}    ${T1030}    expected_status=409
    Should Be Equal    ${resp.json()}[error]    BOOKING_TIME_CONFLICT

TS-06 Booking Starting Exactly At Previous End Is Allowed
    ${room}=    Unique Id    room
    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}
    Create Booking    ${BOB}[headers]    ${room}    ${T10}    ${T11}

TS-07 Start Not Before End Returns 400
    ${room}=    Unique Id    room
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T10}    ${T09}    expected_status=400
    Should Be Equal    ${resp.json()}[error]    INVALID_TIME_RANGE
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T10}    ${T10}    expected_status=400
    Should Be Equal    ${resp.json()}[error]    INVALID_TIME_RANGE

RF-BOOK-01 Concurrent Requests For One Slot Have A Single Winner
    ${room}=    Unique Id    room
    ${codes}=    Post In Parallel    ${BOOKING_URL}/bookings
    ...    ${{ {'resourceId': $room, 'startTime': $T09, 'endTime': $T10} }}    ${ALICE}[headers]    count=4
    Should Be Equal    ${{ sorted($codes) }}    ${{ [201, 409, 409, 409] }}

RF-BOOK-02 Owner Cancels And Gets Notified; Slot Becomes Free Again
    ${room}=    Unique Id    room
    ${created}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}
    ${id}=    Set Variable    ${created.json()}[booking][id]
    ${resp}=    Cancel Booking    ${id}    ${ALICE}[headers]
    Should Be Equal    ${resp.json()}[booking][status]    CANCELLED
    Should Be True    ${resp.json()}[notificationSent]
    ${types}=    Notification Types For Booking    ${ALICE}    ${id}
    Should Be Equal    ${types}    ${{ ['BOOKING_CANCELLED', 'BOOKING_CREATED'] }}
    Cancel Booking    ${id}    ${ALICE}[headers]    expected_status=409
    Create Booking    ${BOB}[headers]    ${room}    ${T09}    ${T10}

RF-BOOK-03 Other User Cannot View Or Cancel A Booking
    ${room}=    Unique Id    room
    ${created}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}
    ${id}=    Set Variable    ${created.json()}[booking][id]
    Get Booking    ${id}    ${BOB}[headers]    expected_status=403
    Cancel Booking    ${id}    ${BOB}[headers]    expected_status=403
    Get Booking    ${id}    ${ALICE}[headers]

RF-BOOK-04 Missing Or Inactive Resource Is Rejected
    ${missing}=    Unique Id    missing
    ${resp}=    Create Booking    ${ALICE}[headers]    ${missing}    ${T09}    ${T10}    expected_status=404
    Should Be Equal    ${resp.json()}[error]    RESOURCE_NOT_FOUND
    ${inactive}=    Unique Id    inactive
    ${resp}=    Create Booking    ${ALICE}[headers]    ${inactive}    ${T09}    ${T10}    expected_status=409
    Should Be Equal    ${resp.json()}[error]    RESOURCE_INACTIVE

RF-BOOK-05 Booking Requires A Valid Token And Students Cannot Use Admin Endpoints
    ${room}=    Unique Id    room
    ${fake}=    Bearer    ${FAKE_TOKEN}
    Create Booking    ${fake}    ${room}    ${T09}    ${T10}    expected_status=401
    Create Booking    ${{ {} }}    ${room}    ${T09}    ${T10}    expected_status=401
    GET    ${BOOKING_URL}/bookings    headers=${ALICE}[headers]    expected_status=403
    POST    ${BOOKING_URL}/closures    headers=${ALICE}[headers]
    ...    json=${{ {'startTime': $T09, 'endTime': $T10} }}    expected_status=403

RF-BOOK-06 Notification 500 Is Retried Once And Booking Still Succeeds
    ${room}=    Unique Id    room
    ${before}=    Failing Notification Calls
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}    base=${BOOKING_NOTIFY_500_URL}
    Should Not Be True    ${resp.json()}[notificationSent]
    ${after}=    Failing Notification Calls
    Should Be Equal As Integers    ${after}    ${before + 2}    msg=Booking should try once and retry once on 5xx
    Booking Should Be Saved    ${resp.json()}[booking][id]    CONFIRMED    ${BOOKING_NOTIFY_500_URL}
    ${cancel}=    Cancel Booking    ${resp.json()}[booking][id]    ${ALICE}[headers]    base=${BOOKING_NOTIFY_500_URL}
    Should Be Equal    ${cancel.json()}[booking][status]    CANCELLED
    Should Not Be True    ${cancel.json()}[notificationSent]

RF-BOOK-07 Unreachable Notification Does Not Block Booking Or Cancel
    ${room}=    Unique Id    room
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}    base=${BOOKING_NOTIFY_DOWN_URL}
    Should Not Be True    ${resp.json()}[notificationSent]
    Booking Should Be Saved    ${resp.json()}[booking][id]    CONFIRMED    ${BOOKING_NOTIFY_DOWN_URL}
    ${cancel}=    Cancel Booking    ${resp.json()}[booking][id]    ${ALICE}[headers]    base=${BOOKING_NOTIFY_DOWN_URL}
    Should Be Equal    ${cancel.json()}[booking][status]    CANCELLED
    Should Not Be True    ${cancel.json()}[notificationSent]

RF-BOOK-08 Mismatched Service Key Is Rejected By Notification But Booking Succeeds
    [Documentation]    Simulates Booking and Notification configured with different SERVICE_KEY values.
    ${room}=    Unique Id    room
    ${resp}=    Create Booking    ${ALICE}[headers]    ${room}    ${T09}    ${T10}    base=${BOOKING_BAD_KEY_URL}
    Should Not Be True    ${resp.json()}[notificationSent]
    Booking Should Be Saved    ${resp.json()}[booking][id]    CONFIRMED    ${BOOKING_BAD_KEY_URL}
    ${types}=    Notification Types For Booking    ${ALICE}    ${resp.json()}[booking][id]
    Should Be Empty    ${types}    msg=Real Notification must not store a notification sent with a wrong key


*** Keywords ***
Failing Notification Calls
    ${resp}=    GET    ${NOTIFICATION_500_URL}/calls    expected_status=200
    RETURN    ${resp.json()}[calls]

Booking Should Be Saved
    [Arguments]    ${booking_id}    ${status}    ${base}
    ${resp}=    Get Booking    ${booking_id}    ${ALICE}[headers]    base=${base}
    Should Be Equal    ${resp.json()}[booking][status]    ${status}
