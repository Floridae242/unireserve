*** Settings ***
Documentation       Shared variables and API keywords for UniReserve integration suites.
Library             RequestsLibrary
Library             String
Library             Collections
Library             Parallel.py


*** Variables ***
${AUTH_URL}             %{AUTH_URL=http://localhost:3001}
${NOTIFICATION_URL}     %{NOTIFICATION_URL=http://localhost:3002}
${BOOKING_URL}          %{BOOKING_URL=http://localhost:3004}
${SERVICE_KEY}          %{SERVICE_KEY=local-dev-service-key}
${PASSWORD}             robot-dummy-password
${FAKE_TOKEN}           ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff


*** Keywords ***
Services Should Be Healthy
    GET    ${AUTH_URL}/health    expected_status=200
    GET    ${NOTIFICATION_URL}/health    expected_status=200

Unique Email
    ${suffix}=    Generate Random String    12    [LOWER][NUMBERS]
    RETURN    robot-${suffix}@example.test

Unique Id
    [Arguments]    ${prefix}
    ${suffix}=    Generate Random String    12    [LOWER][NUMBERS]
    RETURN    ${prefix}-${suffix}

Register User
    [Arguments]    ${email}    ${password}=${PASSWORD}
    ${resp}=    POST    ${AUTH_URL}/auth/register
    ...    json=${{ {'email': $email, 'password': $password} }}    expected_status=201
    RETURN    ${resp.json()}[user]

Login
    [Arguments]    ${email}    ${password}=${PASSWORD}    ${expected_status}=200
    ${resp}=    POST    ${AUTH_URL}/auth/login
    ...    json=${{ {'email': $email, 'password': $password} }}    expected_status=${expected_status}
    RETURN    ${resp}

Bearer
    [Arguments]    ${token}
    RETURN    ${{ {'Authorization': 'Bearer ' + $token} }}

Create Logged In User
    [Documentation]    Registers a fresh dummy student and returns id, email, token and auth headers.
    ${email}=    Unique Email
    ${user}=    Register User    ${email}
    ${resp}=    Login    ${email}
    ${headers}=    Bearer    ${resp.json()}[token]
    RETURN    ${{ {**$user, 'token': $resp.json()['token'], 'headers': $headers} }}

Create Notification
    [Arguments]    ${user_id}    ${booking_id}    ${type}=BOOKING_CREATED
    ...    ${message}=Robot booking confirmed    ${headers}=${None}    ${expected_status}=201
    IF    $headers is None
        ${headers}=    Set Variable    ${{ {'X-Service-Key': $SERVICE_KEY} }}
    END
    ${resp}=    POST    ${NOTIFICATION_URL}/notifications    headers=${headers}
    ...    json=${{ {'userId': $user_id, 'bookingId': $booking_id, 'type': $type, 'message': $message} }}
    ...    expected_status=${expected_status}
    RETURN    ${resp}

List Notifications
    [Arguments]    ${user_id}    ${headers}    ${expected_status}=200
    ${resp}=    GET    ${NOTIFICATION_URL}/notifications/user/${user_id}
    ...    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

Mark Notification Read
    [Arguments]    ${notification_id}    ${headers}    ${expected_status}=200
    ${resp}=    PATCH    ${NOTIFICATION_URL}/notifications/${notification_id}/read
    ...    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

Booking Should Be Healthy
    GET    ${BOOKING_URL}/health    expected_status=200

Create Booking
    [Arguments]    ${headers}    ${resource_id}    ${start}    ${end}    ${expected_status}=201
    ${resp}=    POST    ${BOOKING_URL}/bookings    headers=${headers}
    ...    json=${{ {'resourceId': $resource_id, 'startTime': $start, 'endTime': $end} }}
    ...    expected_status=${expected_status}
    RETURN    ${resp}

Get Booking
    [Arguments]    ${booking_id}    ${headers}    ${expected_status}=200
    ${resp}=    GET    ${BOOKING_URL}/bookings/${booking_id}    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

Cancel Booking
    [Arguments]    ${booking_id}    ${headers}    ${expected_status}=200
    ${resp}=    PATCH    ${BOOKING_URL}/bookings/${booking_id}/cancel    headers=${headers}
    ...    expected_status=${expected_status}
    RETURN    ${resp}

Notification Types For Booking
    [Documentation]    Returns the notification types the user has for one booking, e.g. ['BOOKING_CREATED'].
    [Arguments]    ${user}    ${booking_id}
    ${list}=    List Notifications    ${user}[id]    ${user}[headers]
    ${types}=    Evaluate    sorted([n['type'] for n in $list.json()['notifications'] if n['bookingId'] == $booking_id])
    RETURN    ${types}
