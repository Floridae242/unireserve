*** Settings ***
Documentation       Keywords for UI tests: drive the real frontend in Chrome through a Selenium container.
Library             SeleniumLibrary    timeout=15s
Resource            common.resource


*** Variables ***
${APP_URL}          %{APP_URL=http://localhost:3000}
${SELENIUM_URL}     %{SELENIUM_URL=http://localhost:4444}
# Delay between Selenium actions; e.g. 1s to follow the test in noVNC. 0s in CI.
${SELENIUM_SPEED}   %{SELENIUM_SPEED=0s}


*** Keywords ***
Open UniReserve
    Open Browser    ${APP_URL}    chrome    remote_url=${SELENIUM_URL}
    ...    options=add_argument("--window-size=1366,900")
    Set Selenium Speed    ${SELENIUM_SPEED}

Login Page Should Be Shown
    Wait Until Page Contains    ยินดีต้อนรับกลับมา

Submit Auth Form
    [Arguments]    ${email}    ${password}
    Input Text    name:email    ${email}
    Input Password    name:password    ${password}
    Click Element    css:form button.primary

Register Via UI
    [Arguments]    ${email}    ${password}=${PASSWORD}
    Login Page Should Be Shown
    Click Element    xpath://button[normalize-space()='สมัครสมาชิก']
    Wait Until Page Contains    เริ่มต้นกับ UniReserve
    Submit Auth Form    ${email}    ${password}
    Wait Until Page Contains    สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ

Login Via UI
    [Arguments]    ${email}    ${password}=${PASSWORD}
    Login Page Should Be Shown
    Submit Auth Form    ${email}    ${password}
    Wait Until Page Contains Element    css:nav[aria-label="เมนูหลัก"]
    Page Should Contain    ${email}

Logout Via UI
    Click Element    css:button[aria-label="ออกจากระบบ"]
    Login Page Should Be Shown

Set Datetime Field
    [Documentation]    Typing into datetime-local depends on the browser locale, so set the value directly.
    ...                The booking form reads the inputs with FormData on submit, so no input event is needed.
    [Arguments]    ${name}    ${value}
    Execute Javascript    document.querySelector('input[name="${name}"]').value = '${value}'

Admin Menu Link
    RETURN    xpath://nav[@aria-label='เมนูหลัก']//a[contains(normalize-space(), 'จัดการระบบ')]
