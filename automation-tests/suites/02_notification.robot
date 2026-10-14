*** Settings ***
Documentation       REQ-NOTI-01 across Auth -> Notification. Booking is not implemented yet,
...                 so the suite plays Booking's role by calling POST /notifications with the service key.
Resource            ../resources/common.resource
Suite Setup         Prepare Users


*** Test Cases ***
TS-04 (Notification Part) Notification Is Linked To Booking And User
    ${booking_id}=    Unique Id    booking
    ${created}=    Create Notification    ${ALICE}[id]    ${booking_id}
    Should Be Equal    ${created.json()}[notification][userId]    ${ALICE}[id]
    Should Be Equal    ${created.json()}[notification][bookingId]    ${booking_id}
    Should Not Be True    ${created.json()}[notification][read]
    ${list}=    List Notifications    ${ALICE}[id]    ${ALICE}[headers]
    ${booking_ids}=    Evaluate    [n['bookingId'] for n in $list.json()['notifications']]
    Should Contain    ${booking_ids}    ${booking_id}

RF-NOTI-01 Retrying The Same Booking Event Does Not Duplicate
    ${booking_id}=    Unique Id    booking
    ${first}=    Create Notification    ${ALICE}[id]    ${booking_id}
    ${retry}=    Create Notification    ${ALICE}[id]    ${booking_id}    expected_status=200
    Should Be Equal    ${retry.json()}[notification][id]    ${first.json()}[notification][id]
    ${list}=    List Notifications    ${ALICE}[id]    ${ALICE}[headers]
    ${matches}=    Evaluate    [n for n in $list.json()['notifications'] if n['bookingId'] == $booking_id]
    Length Should Be    ${matches}    1

RF-NOTI-02 Owner Can Mark Notification As Read
    ${booking_id}=    Unique Id    booking
    ${created}=    Create Notification    ${ALICE}[id]    ${booking_id}
    ${resp}=    Mark Notification Read    ${created.json()}[notification][id]    ${ALICE}[headers]
    Should Be True    ${resp.json()}[notification][read]

RF-NOTI-03 Other User Cannot See Or Mark Someone Else's Notifications
    ${booking_id}=    Unique Id    booking
    ${created}=    Create Notification    ${ALICE}[id]    ${booking_id}
    List Notifications    ${ALICE}[id]    ${BOB}[headers]    expected_status=403
    Mark Notification Read    ${created.json()}[notification][id]    ${BOB}[headers]    expected_status=403

RF-NOTI-04 Invalid Or Missing Token Is Rejected Via Auth
    ${fake}=    Bearer    ${FAKE_TOKEN}
    ${resp}=    List Notifications    ${ALICE}[id]    ${fake}    expected_status=401
    Should Be Equal    ${resp.json()}[error]    INVALID_TOKEN
    List Notifications    ${ALICE}[id]    ${{ {} }}    expected_status=401

RF-NOTI-05 Only Internal Services Can Create Notifications
    ${booking_id}=    Unique Id    booking
    Create Notification    ${ALICE}[id]    ${booking_id}    headers=${{ {} }}    expected_status=401
    Create Notification    ${ALICE}[id]    ${booking_id}    headers=${ALICE}[headers]    expected_status=401
    ${wrong}=    Set Variable    ${{ {'X-Service-Key': 'wrong-service-key-123'} }}
    Create Notification    ${ALICE}[id]    ${booking_id}    headers=${wrong}    expected_status=401


*** Keywords ***
Prepare Users
    Services Should Be Healthy
    ${alice}=    Create Logged In User
    ${bob}=    Create Logged In User
    Set Suite Variable    ${ALICE}    ${alice}
    Set Suite Variable    ${BOB}    ${bob}
