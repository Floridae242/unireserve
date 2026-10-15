*** Settings ***
Documentation       Main user flows through the real web page (frontend + all five services).
...                 A fresh student registers and logs in, books a resource, sees the booking and its
...                 notification, and only the admin account sees the admin menu.
Resource            ../resources/ui.resource
Suite Setup         Prepare UI Suite
Suite Teardown      Close All Browsers
Test Teardown       Run Keyword If Test Failed    Capture Page Screenshot


*** Test Cases ***
UI-01 Student Registers And Logs In Through The Web Page
    Go To    ${APP_URL}
    Register Via UI    ${STUDENT_EMAIL}
    Login Via UI    ${STUDENT_EMAIL}
    ${admin_menu}=    Admin Menu Link
    Page Should Not Contain Element    ${admin_menu}

UI-02 Student Books A Resource And Sees The Booking And Its Notification
    Go To    ${APP_URL}/resources/${ROOM}
    Wait Until Element Contains    css:h1    ${ROOM_NAME}
    Set Datetime Field    start    2030-01-01T09:00
    Set Datetime Field    end    2030-01-01T10:00
    Click Element    xpath://button[contains(normalize-space(), 'ยืนยันการจอง')]
    Wait Until Page Contains    จองสำเร็จ ดูรายการได้ใน

    Go To    ${APP_URL}/bookings
    Wait Until Page Contains Element
    ...    xpath://div[contains(@class,'booking-row')][.//h3[normalize-space()='${ROOM_NAME}']]//span[normalize-space()='ยืนยันแล้ว']

    Go To    ${APP_URL}/notifications
    ${unread}=    Set Variable    xpath://article[contains(@class,'unread')][contains(normalize-space(), '${ROOM_NAME}')]
    Wait Until Page Contains Element    ${unread}
    Click Element    ${unread}//button[normalize-space()='อ่านแล้ว']
    Wait Until Page Does Not Contain Element    ${unread}

UI-03 Only The Admin Account Sees The Admin Page
    Go To    ${APP_URL}/admin
    Wait Until Page Contains    คุณไม่มีสิทธิ์เข้าถึงหน้านี้
    Logout Via UI
    Login Via UI    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${admin_menu}=    Admin Menu Link
    Click Element    ${admin_menu}
    Wait Until Element Contains    css:h1    จัดการระบบ


*** Keywords ***
Prepare UI Suite
    ${admin}=    Login    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${admin_headers}=    Bearer    ${admin.json()}[token]
    Set Suite Variable    ${ADMIN_HEADERS}    ${admin_headers}
    ${room}=    Unique Id    room
    Ensure Booking Resource Exists    ${room}
    Set Suite Variable    ${ROOM}    ${room}
    Set Suite Variable    ${ROOM_NAME}    Robot fixture ${room}
    ${email}=    Unique Email
    Set Suite Variable    ${STUDENT_EMAIL}    ${email}
    Open UniReserve
