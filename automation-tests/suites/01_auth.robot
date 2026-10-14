*** Settings ***
Documentation       REQ-AUTH-01 against the running member1 Auth service.
Resource            ../resources/common.resource
Suite Setup         Services Should Be Healthy


*** Test Cases ***
TS-01 Valid Login Returns Token For Registered User
    ${email}=    Unique Email
    ${user}=    Register User    ${email}
    ${resp}=    Login    ${email}
    Length Should Be    ${resp.json()}[token]    64
    Should Be Equal    ${resp.json()}[user]    ${user}
    ${headers}=    Bearer    ${resp.json()}[token]
    ${verified}=    POST    ${AUTH_URL}/auth/verify    headers=${headers}    expected_status=200
    Should Be Equal    ${verified.json()}[user][id]    ${user}[id]

TS-02 Wrong Password Returns 401 Without Token
    ${email}=    Unique Email
    Register User    ${email}
    ${resp}=    Login    ${email}    password=wrong-password-123    expected_status=401
    Should Be Equal    ${resp.json()}[error]    INVALID_CREDENTIALS
    Dictionary Should Not Contain Key    ${resp.json()}    token

RF-AUTH-01 Unknown Token Is Rejected
    ${headers}=    Bearer    ${FAKE_TOKEN}
    ${resp}=    POST    ${AUTH_URL}/auth/verify    headers=${headers}    expected_status=401
    Should Be Equal    ${resp.json()}[error]    INVALID_TOKEN
