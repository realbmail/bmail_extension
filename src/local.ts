import browser from "webextension-polyfill";

export function translateHomePage() {
    document.title = browser.i18n.getMessage('home_title');
    document.getElementById('user-consent-label')!.textContent = browser.i18n.getMessage('home_user_content');
    document.getElementById('create-account-btn')!.textContent = browser.i18n.getMessage('home_wallet_create');
    document.getElementById('import-account-btn')!.textContent = browser.i18n.getMessage('home_wallet_import');

    document.getElementById('confirm-password-label1')!.textContent = browser.i18n.getMessage('home_password_label');
    document.getElementById('confirm-password-label2')!.textContent = browser.i18n.getMessage('home_password_label');

    let confirmPasswordInput = document.getElementById('home-create-password') as HTMLInputElement;
    confirmPasswordInput!.placeholder = browser.i18n.getMessage('home_password_placeholder');
    confirmPasswordInput = document.getElementById('home-confirm-password') as HTMLInputElement;
    confirmPasswordInput!.placeholder = browser.i18n.getMessage('home_password_placeholder2');
    document.getElementById('create-new-account-btn')!.textContent = browser.i18n.getMessage('home_wallet_create_btn');

    let btn = document.querySelector('#view-recovery-phrase .primary-button') as HTMLButtonElement;
    btn.textContent = browser.i18n.getMessage('home_next_step');

    document.getElementById('import-password-label1')!.textContent = browser.i18n.getMessage('home_password_label');
    document.getElementById('import-password-label2')!.textContent = browser.i18n.getMessage('home_password_label');

    let input = document.getElementById('imported-new-password') as HTMLInputElement;
    input!.placeholder = browser.i18n.getMessage('home_password_placeholder');
    input = document.getElementById('imported-confirm-password') as HTMLInputElement;
    input!.placeholder = browser.i18n.getMessage('home_password_placeholder2');
    document.getElementById('import-new-account-btn')!.textContent = browser.i18n.getMessage('home_wallet_create_btn');

    btn = document.querySelector('#view-confirm-recovery .primary-button') as HTMLButtonElement;
    btn.textContent = browser.i18n.getMessage('home_confirm_import');

    document.getElementById('import_container_tip')!.textContent = browser.i18n.getMessage('import_container_tip');

    btn = document.querySelector('#view-import-wallet .primary-button') as HTMLButtonElement;
    btn.textContent = browser.i18n.getMessage('home_confirm_recovery');

    document.getElementById("error-message")!.textContent = browser.i18n.getMessage('recover_error_message');
    document.getElementById("current-wallet-address-lbl")!.textContent = browser.i18n.getMessage('wallet_address_lbl');

    document.getElementById("account_level_free")!.textContent = browser.i18n.getMessage('account_level_free');
    document.getElementById("account_level_free_unit")!.textContent = browser.i18n.getMessage('account_level_free_unit');
    document.querySelectorAll(".account_level_p2p_encryption").forEach(div => {
        div.textContent = browser.i18n.getMessage('p2p_encryption');
    });
    document.querySelectorAll(".account_level_bind_address").forEach(div => {
        div.textContent = browser.i18n.getMessage('bind_address');
    });

    document.getElementById("account_level_normal")!.textContent = browser.i18n.getMessage('account_level_normal');
    document.getElementById("account_level_normal_unit")!.innerText = browser.i18n.getMessage('normal_price_label');

    document.querySelectorAll(".attachment_p2p_encryption").forEach(div => {
        div.textContent = browser.i18n.getMessage('attachment_encryption');
    })

    document.getElementById("account_level_plus")!.textContent = browser.i18n.getMessage('account_level_plus');
    document.getElementById("account_level_plus_unit")!.textContent = browser.i18n.getMessage('account_level_plus_unit');

    document.getElementById("account_level_enterprise")!.textContent = browser.i18n.getMessage('account_level_enterprise');
    document.getElementById("account_level_enterprise_unit")!.textContent = browser.i18n.getMessage('account_level_enterprise_unit');

    document.querySelectorAll(".account_level_sdk").forEach(div => {
        div.textContent = browser.i18n.getMessage('account_level_sdk');
    })

    document.querySelectorAll(".bind_address_no_limit").forEach(div => {
        div.textContent = browser.i18n.getMessage('bind_address_no_limit');
    })

    document.querySelectorAll(".ens_address").forEach(div => {
        div.textContent = browser.i18n.getMessage('ens_address');
    })

    document.getElementById("price_val_money_lbl")!.textContent = browser.i18n.getMessage('price_val_money_lbl');
    document.getElementById("price_val_money_unit")!.textContent = browser.i18n.getMessage('price_val_money_unit');
    document.getElementById("price_val_money_action")!.textContent = browser.i18n.getMessage('price_val_money_action');
    document.getElementById("active_account")!.textContent = browser.i18n.getMessage('active_account');

    document.getElementById("des_pin_title")!.textContent = browser.i18n.getMessage('des_pin_title');
    document.getElementById("des_pin_step1")!.textContent = browser.i18n.getMessage('des_pin_step1');
    document.getElementById("des_pin_step2")!.textContent = browser.i18n.getMessage('des_pin_step2');
    document.getElementById("des_pin_step3")!.textContent = browser.i18n.getMessage('des_pin_step3');

    document.getElementById("view-recovery-phrase-copy-seed")!.textContent = browser.i18n.getMessage('copy_to_clipboard');
    document.getElementById("view-recovery-phrase-hide-seed")!.textContent = browser.i18n.getMessage('reveal_seed_phrase');
}

export function translateMainPage() {
    document.getElementById('title_login_welcome')!.textContent = browser.i18n.getMessage('title_login_welcome');
    document.getElementById('welcome_login_sub_title')!.textContent = browser.i18n.getMessage('welcome_login_sub_title');
    document.getElementById('login_password_lbl')!.textContent = browser.i18n.getMessage('login_password_lbl');
    document.getElementById('login_unlock_btn')!.textContent = browser.i18n.getMessage('login_unlock_btn');
    document.getElementById('login_new_account')!.textContent = browser.i18n.getMessage('login_new_account');
    document.getElementById('login_forget_password')!.textContent = browser.i18n.getMessage('login_forget_password');
    document.getElementById("supported-target-title")!.textContent = browser.i18n.getMessage('supported_mail_service');

    document.getElementById('bmail-account-level-lbl')!.textContent = browser.i18n.getMessage('address_level');
    document.getElementById('bmail-active-account')!.textContent = browser.i18n.getMessage('active_account');

    document.getElementById('bmail-address-lbl')!.textContent = browser.i18n.getMessage('address_label');
    document.getElementById('bmail_address_copy')!.textContent = browser.i18n.getMessage('copy_to_clipboard');
    document.getElementById('bmail-account-license-lbl')!.textContent = browser.i18n.getMessage('license_lbl');

    document.getElementById('binding-email-unbind-btn')!.textContent = browser.i18n.getMessage('unbind_btn');
    document.getElementById('bound_address_list')!.textContent = browser.i18n.getMessage('bound_address_list');


    document.getElementById('bmail-email-address-lbl')!.textContent = browser.i18n.getMessage('email_label');

    document.getElementById('invalid-target-tips')!.textContent = browser.i18n.getMessage('invalid_tips');
    document.getElementById('invalid-target-title')!.textContent = browser.i18n.getMessage('target_sites');
    document.getElementById('service_email')!.textContent = browser.i18n.getMessage('service_email');

    document.getElementById('dialog-tips-close-button')!.textContent = browser.i18n.getMessage('close');
    document.getElementById('dialog-tips-confirm-button')!.textContent = browser.i18n.getMessage('ok');

    document.getElementById('supported-emails-title')!.textContent = browser.i18n.getMessage('supported_title');
    document.getElementById('supported_step1')!.textContent = browser.i18n.getMessage('supported_step1');
    document.getElementById('supported_step2')!.textContent = browser.i18n.getMessage('supported_step2');

    document.getElementById('dialog-tips-close-button')!.textContent = browser.i18n.getMessage('close');
    document.getElementById('current-email-bind-btn')!.textContent = browser.i18n.getMessage('bind_email');


    document.getElementById('bmail-quit-lbl')!.textContent = browser.i18n.getMessage('account_exit');
    document.getElementById('bmail-network-lbl')!.textContent = browser.i18n.getMessage('network_setting');
    (document.getElementById('contact-server-val') as HTMLInputElement).placeholder = browser.i18n.getMessage('network_item_placeholder');
    document.getElementById('contact-server-add')!.textContent = browser.i18n.getMessage('network_item_add');

}