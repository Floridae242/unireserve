*** Settings ***
Documentation       Shared variables and API keywords for UniReserve integration suites.
Library             RequestsLibrary
Library             String
Library             Collections
Library             Parallel.py


*** Variables ***
${AUTH_URL}             %{AUTH_URL=http://localhost:3001}
${NOTIFICATION_URL}     %{NOTIFICATION_URL=http://localhost:3002}
${RESOURCE_URL}         %{RESOURCE_URL=http://localhost:3003}
${BOOKING_URL}          %{BOOKING_URL=http://localhost:3004}
${BOOKING_NOTIFY_500_URL}     %{BOOKING_NOTIFY_500_URL=http://localhost:3014}
${BOOKING_NOTIFY_DOWN_URL}    %{BOOKING_NOTIFY_DOWN_URL=http://localhost:3024}
${BOOKING_BAD_KEY_URL}        %{BOOKING_BAD_KEY_URL=http://localhost:3034}
${NOTIFICATION_500_URL}       %{NOTIFICATION_500_URL=http://localhost:3012}
${REVIEW_URL}                 %{REVIEW_URL=http://localhost:3005}
${SERVICE_KEY}          %{SERVICE_KEY=local-dev-service-key}
${ADMIN_EMAIL}          %{ADMIN_EMAIL=admin@example.test}
${ADMIN_PASSWORD}       %{ADMIN_PASSWORD=robot-only-admin-password}
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
    [Arguments]    ${headers}    ${resource_id}    ${start}    ${end}    ${expected_status}=201    ${base}=${BOOKING_URL}
    Ensure Booking Resource Exists    ${resource_id}
    ${resp}=    POST    ${base}/bookings    headers=${headers}
    ...    json=${{ {'resourceId': $resource_id, 'startTime': $start, 'endTime': $end} }}
    ...    expected_status=${expected_status}
    RETURN    ${resp}

Get Booking
    [Arguments]    ${booking_id}    ${headers}    ${expected_status}=200    ${base}=${BOOKING_URL}
    ${resp}=    GET    ${base}/bookings/${booking_id}    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

Cancel Booking
    [Arguments]    ${booking_id}    ${headers}    ${expected_status}=200    ${base}=${BOOKING_URL}
    ${resp}=    PATCH    ${base}/bookings/${booking_id}/cancel    headers=${headers}
    ...    expected_status=${expected_status}
    RETURN    ${resp}

Notification Types For Booking
    [Documentation]    Returns the notification types the user has for one booking, e.g. ['BOOKING_CREATED'].
    [Arguments]    ${user}    ${booking_id}
    ${list}=    List Notifications    ${user}[id]    ${user}[headers]
    ${types}=    Evaluate    sorted([n['type'] for n in $list.json()['notifications'] if n['bookingId'] == $booking_id])
    RETURN    ${types}

Get Resource
    [Arguments]    ${resource_id}    ${expected_status}=200
    ${resp}=    GET    ${RESOURCE_URL}/resources/${resource_id}    expected_status=${expected_status}
    RETURN    ${resp}

List Resources
    [Arguments]    ${headers}=${None}    ${active}=${None}    ${type}=${None}    ${expected_status}=200
    ${params}=    Create Dictionary
    IF    $active is not None    Set To Dictionary    ${params}    active=${active}
    IF    $type is not None    Set To Dictionary    ${params}    type=${type}
    IF    $headers is None
        ${resp}=    GET    ${RESOURCE_URL}/resources    params=${params}    expected_status=${expected_status}
    ELSE
        ${resp}=    GET    ${RESOURCE_URL}/resources    headers=${headers}    params=${params}    expected_status=${expected_status}
    END
    RETURN    ${resp}

Ensure Booking Resource Exists
    [Documentation]    Creates explicit fixtures through the admin API, never fabricating resources in production.
    [Arguments]    ${resource_id}
    IF    not ($resource_id.startswith('room-') or $resource_id.startswith('inactive-'))
        RETURN
    END
    ${existing}=    GET    ${RESOURCE_URL}/resources/${resource_id}    expected_status=any
    IF    $existing.status_code == 200
        RETURN
    END
    Should Be Equal As Integers    ${existing.status_code}    404
    ${active}=    Evaluate    not $resource_id.startswith('inactive-')
    POST    ${RESOURCE_URL}/resources    headers=${ADMIN_HEADERS}
    ...    json=${{ {'id': $resource_id, 'name': 'Robot fixture ' + $resource_id, 'active': $active} }}
    ...    expected_status=201
Review Should Be Healthy
    GET    ${REVIEW_URL}/health    expected_status=200

Create Review
    [Arguments]    ${headers}    ${booking_id}    ${rating}    ${comment}=${None}    ${expected_status}=201    ${base}=${REVIEW_URL}
    ${body}=    Create Dictionary    bookingId=${booking_id}    rating=${rating}
    IF    $comment is not None
        Set To Dictionary    ${body}    comment=${comment}
    END
    ${resp}=    POST    ${base}/reviews    headers=${headers}    json=${body}    expected_status=${expected_status}
    RETURN    ${resp}

Get Review
    [Arguments]    ${review_id}    ${headers}    ${expected_status}=200    ${base}=${REVIEW_URL}
    ${resp}=    GET    ${base}/reviews/${review_id}    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

List Reviews For Resource
    [Arguments]    ${resource_id}    ${headers}    ${expected_status}=200    ${base}=${REVIEW_URL}
    ${resp}=    GET    ${base}/reviews/resource/${resource_id}    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}

List Reviews For User
    [Arguments]    ${user_id}    ${headers}    ${expected_status}=200    ${base}=${REVIEW_URL}
    ${resp}=    GET    ${base}/reviews/user/${user_id}    headers=${headers}    expected_status=${expected_status}
    RETURN    ${resp}
