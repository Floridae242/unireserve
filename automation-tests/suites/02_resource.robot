*** Settings ***
Documentation       REQ-RES-01 against the running member3 Resource service.
...                 Public and student users see only active resources (no token / student token).
...                 GET /resources/:id contract used by Booking Service is also verified here.
Resource            ../resources/common.resource
Suite Setup         Resource Should Be Healthy


*** Test Cases ***
TS-03 Public List Returns Only Active Resources
    [Documentation]    Public request (no token) must return only active resources (REQ-RES-01).
    ...                Uses dynamic ID fallback: room-* is active, inactive-* is inactive.

    # Public request (no token) — sees only active
    ${pub}=    List Resources
    Should Be True    all(r['active'] for r in $pub.json()['resources'])

    # Student token also sees only active
    ${student}=    List Resources    headers=${ALICE}[headers]
    Should Be True    all(r['active'] for r in $student.json()['resources'])

    # Dynamic fallback: active room-* is always returned
    ${active_id}=    Unique Id    room
    ${r}=    Get Resource    ${active_id}
    Should Be Equal    ${r.json()}[resource][id]    ${active_id}
    Should Be True    ${r.json()}[resource][active]

RF-RES-01 GET Single Resource Returns 200 For Active And Inactive And 404 For Missing
    [Documentation]    GET /resources/:id — Booking Service contract.
    ...                active (room-*) → 200 active:true; inactive-* → 200 active:false; missing-* → 404.
    ${active_id}=    Unique Id    room
    ${inactive_id}=    Unique Id    inactive
    ${missing_id}=    Unique Id    missing

    # Active via dynamic fallback
    ${r1}=    Get Resource    ${active_id}
    Should Be Equal    ${r1.json()}[resource][id]    ${active_id}
    Should Be True    ${r1.json()}[resource][active]

    # Inactive via dynamic fallback
    ${r2}=    Get Resource    ${inactive_id}
    Should Be Equal    ${r2.json()}[resource][id]    ${inactive_id}
    Should Not Be True    ${r2.json()}[resource][active]

    # Missing returns 404
    ${r3}=    Get Resource    ${missing_id}    expected_status=404
    Should Be Equal    ${r3.json()}[error]    RESOURCE_NOT_FOUND

RF-RES-02 Unauthenticated And Student Cannot Create Update Or Delete Resources
    [Documentation]    POST/PATCH/DELETE require admin token — student gets 403, no token gets 401.
    ${room_id}=    Unique Id    room
    ${payload}=    Create Dictionary    id=${room_id}    name=Unauthorized Room    type=room    capacity=10    active=${True}

    # No token → 401
    ${r1}=    POST    ${RESOURCE_URL}/resources    json=${payload}    expected_status=401
    Should Be Equal    ${r1.json()}[error]    INVALID_TOKEN

    # Student token → 403
    ${r2}=    POST    ${RESOURCE_URL}/resources    headers=${ALICE}[headers]
    ...    json=${payload}    expected_status=403
    Should Be Equal    ${r2.json()}[error]    FORBIDDEN

    # PATCH — student → 403
    ${dyn_id}=    Unique Id    room
    ${r3}=    PATCH    ${RESOURCE_URL}/resources/${dyn_id}    headers=${ALICE}[headers]
    ...    json=${{ {'name': 'Renamed'} }}    expected_status=403
    Should Be Equal    ${r3.json()}[error]    FORBIDDEN

    # DELETE — student → 403
    ${r4}=    DELETE    ${RESOURCE_URL}/resources/${dyn_id}    headers=${ALICE}[headers]
    ...    expected_status=403
    Should Be Equal    ${r4.json()}[error]    FORBIDDEN


*** Keywords ***
Resource Should Be Healthy
    ${resp}=    GET    ${RESOURCE_URL}/health    expected_status=200
    Should Be Equal    ${resp.json()}[status]    ok
