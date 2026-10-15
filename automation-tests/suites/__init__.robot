*** Settings ***
Documentation       Top-level setup shared by every suite. Users are created once per run because Auth
...                 allows only 30 register/login requests per minute per IP.
Resource            ../resources/common.resource
Suite Setup         Prepare Shared Users


*** Keywords ***
Prepare Shared Users
    Services Should Be Healthy
    ${admin}=    Login    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${admin_headers}=    Bearer    ${admin.json()}[token]
    Set Global Variable    ${ADMIN_HEADERS}    ${admin_headers}
    ${alice}=    Create Logged In User
    ${bob}=    Create Logged In User
    Set Global Variable    ${ALICE}    ${alice}
    Set Global Variable    ${BOB}    ${bob}
