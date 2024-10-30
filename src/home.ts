import {initDatabase} from "./database";
import {
    BMRequestToSrv,
    createQRCodeImg, encodeHex,
    sendMessageToBackground,
    showView, signDataByMessage
} from "./utils";
import {translateHomePage} from "./local";
import {generateMnemonic, validateMnemonic, wordlists} from 'bip39';
import browser from "webextension-polyfill";
import {DbWallet, queryCurWallet} from "./wallet";
import {AccountOperation} from "./proto/bmail_srv";
import {MsgType} from "./consts";
import {createNewWallet} from "./background";

document.addEventListener("DOMContentLoaded", initWelcomePage as EventListener);
let ___mnemonic_in_mem: string | null = null;
let __key_for_mnemonic_temp = '__key_for_mnemonic_temp__';
const wordlist = wordlists.english;
const __mnemonic_len = 12;

async function initWelcomePage(): Promise<void> {
    await initDatabase();
    translateHomePage();
    initWelcomeDiv();
    initPasswordDiv();
    initMnemonicDiv();
    initMnemonicConfirmDiv();
    initImportPasswordDiv();
    initCreateSuccessDiv();

    window.addEventListener('hashchange', function () {
        showView(window.location.hash, router);
    });

    showView(window.location.hash || '#onboarding/welcome', router);

    (window as any).navigateTo = navigateTo;
}

function initWelcomeDiv(): void {
    const agreeCheckbox = document.getElementById('user-consent') as HTMLInputElement;
    const createButton = document.getElementById('create-account-btn') as HTMLButtonElement;
    const importButton = document.getElementById('import-account-btn') as HTMLButtonElement;

    createButton.addEventListener('click', () => {
        navigateTo('#onboarding/create-password');
    });

    createButton.disabled = !agreeCheckbox.checked;
    agreeCheckbox.addEventListener('change', () => {
        createButton.disabled = !agreeCheckbox.checked;
    });

    importButton.addEventListener('click', importWallet);
}

function initPasswordDiv(): void {
    const createPasswordButton = document.querySelector('#view-create-password .primary-button') as HTMLButtonElement;
    createPasswordButton.addEventListener('click', createWalletAction);
}

function navigateTo(hash: string): void {
    history.pushState(null, '', hash);
    showView(hash, router);
}

function router(path: string): void {
    if (path === '#onboarding/recovery-phrase') {
        displayMnemonic();
    }
    if (path === '#onboarding/confirm-recovery') {
        displayConfirmVal();
    }
    if (path === '#onboarding/import-wallet') {
        generateRecoveryPhraseInputs();
    }
    if (path === '#onboarding/account-home') {
        prepareAccountData();
    }
    if (path === '#onboarding/buy-vip') {
        generateQrCodeForVipBuying().then();
    }
}

function importWallet(): void {
    navigateTo('#onboarding/import-wallet');
    // generateRecoveryPhraseInputs();
}

async function createWalletAction(): Promise<void> {
    const passwordBtn1 = document.getElementById("home-create-password") as HTMLInputElement;
    const passwordBtn2 = document.getElementById("home-confirm-password") as HTMLInputElement;

    const password1 = passwordBtn1.value.trim()
    const password2 = passwordBtn2.value.trim()
    if (password1.length < 8) {
        alert("Password is invalid");
        return;
    }
    if (password1 !== password2) {
        alert("Passwords are not the same");
        return;
    }

    const mnemonic = generateMnemonic();
    ___mnemonic_in_mem = mnemonic;
    sessionStorage.setItem(__key_for_mnemonic_temp, mnemonic);
    const wallet = await createNewWallet(mnemonic, password1);
    if (!wallet) {
        console.log("------>>> create wallet failed")
        return;
    }
    console.log("creat wallet success=>", wallet.address);
    passwordBtn1.value = ''
    passwordBtn2.value = ''
    navigateTo('#onboarding/recovery-phrase');
    displayMnemonic();
}

function displayMnemonic(): void {
    if (!___mnemonic_in_mem) {
        ___mnemonic_in_mem = sessionStorage.getItem(__key_for_mnemonic_temp);
    }

    if (!___mnemonic_in_mem) {
        console.error('No mnemonic found in session storage.');
        return;
    }

    const wordsArray = ___mnemonic_in_mem.split(' ');
    const mnemonicContainer = document.querySelector(".recovery-phrase-container") as HTMLElement;
    mnemonicContainer.innerHTML = ''; // 清空以前的内容

    wordsArray.forEach((word, index) => {
        const template = document.getElementById("recovery-phrase-item-template") as HTMLElement;
        const div = template.cloneNode(true) as HTMLElement;
        div.style.display = 'block';
        const indexElement = div.querySelector(".phrase-item-index") as HTMLElement;
        const valueElement = div.querySelector(".phrase-item-value") as HTMLElement;
        indexElement.innerText = (index + 1).toString();
        valueElement.innerText = word;
        mnemonicContainer.appendChild(div);
    });
}

function initMnemonicDiv(): void {
    const nextBtnForConfirm = document.querySelector('#view-recovery-phrase .primary-button') as HTMLButtonElement;
    nextBtnForConfirm.addEventListener('click', nextToConfirmPage);

    const hideSeedButton = document.getElementById("view-recovery-phrase-hide-seed") as HTMLButtonElement;
    hideSeedButton.addEventListener('click', hideSeedDiv);

    const copySeedButton = document.getElementById("view-recovery-phrase-copy-seed") as HTMLButtonElement;
    copySeedButton.addEventListener('click', () => {
        if (!___mnemonic_in_mem) {
            return;
        }
        navigator.clipboard.writeText(___mnemonic_in_mem).then(() => {
            alert(browser.i18n.getMessage('copy_success'));
        }).catch(err => {
            const e = err as Error
            console.error('------>>>Error copying text: ', e.message);
        });
    });
}

function nextToConfirmPage() {
    navigateTo('#onboarding/confirm-recovery');
    displayConfirmVal();
}

function hideSeedDiv(this: HTMLElement): void {
    const recoveryPhraseContainer = document.querySelector('.recovery-phrase-container') as HTMLElement;
    const seedPhraseVisible = recoveryPhraseContainer.dataset.visible === 'true';
    if (seedPhraseVisible) {
        recoveryPhraseContainer.classList.add('hidden-seed-phrase');
        this.textContent = browser.i18n.getMessage('reveal_seed_phrase');
    } else {
        recoveryPhraseContainer.classList.remove('hidden-seed-phrase');
        this.textContent = browser.i18n.getMessage('hide_seed_phrase');
    }
    recoveryPhraseContainer.dataset.visible = String(!seedPhraseVisible);
}

function displayConfirmVal(): void {
    if (!___mnemonic_in_mem) {
        ___mnemonic_in_mem = sessionStorage.getItem(__key_for_mnemonic_temp);
    }

    if (!___mnemonic_in_mem) {
        console.error('No mnemonic found in session storage.');
        return;
    }

    const wordsArray: string[] = ___mnemonic_in_mem.split(' ');
    const indices = new Map<number, boolean>();
    while (indices.size < 3) {
        const randomIndex = Math.floor(Math.random() * wordsArray.length);
        if (!indices.get(randomIndex)) {
            indices.set(randomIndex, true);
        }
    }

    const mnemonicContainer = document.querySelector(".recovery-phrase-grid") as HTMLElement;
    mnemonicContainer.innerHTML = '';

    wordsArray.forEach((word, index) => {
        let div: HTMLElement;
        if (indices.get(index)) {
            const template = document.getElementById("phrase-item-writeOnly") as HTMLElement;
            div = template.cloneNode(true) as HTMLElement;
            div.classList.add('hidden-word');
            div.dataset.correctWord = wordsArray[index];
            const input = div.querySelector(".recovery-input") as HTMLInputElement;
            input.addEventListener('input', checkConfirmUserPhrase);
        } else {
            const template = document.getElementById("phrase-item-readOnly") as HTMLElement;
            div = template.cloneNode(true) as HTMLElement;
            const input = div.querySelector(".recovery-input") as HTMLInputElement;
            input.value = word;
        }
        div.id = '';
        div.style.display = 'block';
        const indexElement = div.querySelector(".phrase-item-index") as HTMLElement;
        indexElement.innerText = (index + 1).toString();
        mnemonicContainer.appendChild(div);
    });
}

function checkConfirmUserPhrase(this: HTMLInputElement): void {
    let confirmIsOk = true;
    document.querySelectorAll(".recovery-phrase-grid .hidden-word").forEach(div => {
        const element = div as HTMLElement;
        const input = element.querySelector(".recovery-input") as HTMLInputElement;
        if (element.dataset.correctWord !== input.value) {
            confirmIsOk = false;
            if (input.value.length > 0) {
                element.classList.add('error-message');
            }
        } else {
            element.classList.remove('error-message');
        }
    });

    const primaryButton = document.querySelector("#view-confirm-recovery .primary-button") as HTMLButtonElement;
    primaryButton.disabled = !confirmIsOk;
}

function initImportPasswordDiv(): void {
    const importBtn = document.querySelector("#view-password-for-imported .primary-button") as HTMLButtonElement;
    importBtn.addEventListener('click', actionOfWalletImport);

    const importedNewPassword = document.getElementById("imported-new-password") as HTMLInputElement;
    importedNewPassword.addEventListener('input', checkImportPassword);

    const importedConfirmPassword = document.getElementById("imported-confirm-password") as HTMLInputElement;
    importedConfirmPassword.addEventListener('input', checkImportPassword);
}

async function actionOfWalletImport(): Promise<void> {
    const passwordInput = document.getElementById("imported-new-password") as HTMLInputElement;
    const password = passwordInput.value.trim();

    if (!___mnemonic_in_mem) {
        navigateTo('#onboarding/welcome');
        return;
    }

    const wallet = await createNewWallet(___mnemonic_in_mem, password);
    if (!wallet) {
        console.log("------>>> create wallet failed")
        return;
    }
    ___mnemonic_in_mem = null;
    sessionStorage.removeItem(__key_for_mnemonic_temp);
    passwordInput.value = '';
    const importedConfirmPassword = document.getElementById("imported-confirm-password") as HTMLInputElement;
    importedConfirmPassword.value = '';
    //TODO: skip buy vip page
    // navigateTo('#onboarding/account-home');

    const address = wallet.address.bmail_address;
    await freeActiveAccount(address);
    navigateTo('#onboarding/account-success');

}


function checkImportPassword(this: HTMLInputElement): void {
    const parent = document.getElementById("view-password-for-imported") as HTMLElement;//
    const okBtn = parent.querySelector(".primary-button") as HTMLButtonElement;

    const pwd: string[] = [];
    parent.querySelectorAll("input").forEach(input => {
        const elm = input as HTMLInputElement
        if (elm.type === 'password' || elm.type === 'text') {
            pwd.push(elm.value);
        }
    });

    const errMsg = parent.querySelector(".error-message") as HTMLElement;
    if (pwd[0].length < 8 && pwd[0].length > 0) {
        errMsg.innerText = "Password must be longer than 8 characters";
        errMsg.style.display = 'block';
        okBtn.disabled = true;
        return;
    }

    if (pwd[0] !== pwd[1]) {
        errMsg.innerText = "Passwords are not the same";
        errMsg.style.display = 'block';
        okBtn.disabled = true;
        return;
    }

    errMsg.innerText = '';
    errMsg.style.display = 'none';
    okBtn.disabled = !(pwd[0].length >= 8);
}


function generateRecoveryPhraseInputs(): void {
    setRecoverPhaseTips(true, '');

    const recoveryPhraseInputs = document.getElementById('recovery-phrase-inputs') as HTMLElement;
    const template = document.getElementById("recovery-phrase-row-template") as HTMLTemplateElement;

    recoveryPhraseInputs.innerHTML = '';

    for (let i = 0; i < __mnemonic_len; i += 3) {
        const rowDiv = template.cloneNode(true) as HTMLElement;
        rowDiv.style.display = 'grid';
        rowDiv.id = '';
        recoveryPhraseInputs.appendChild(rowDiv);
        rowDiv.querySelectorAll("input").forEach(input => {
            input.addEventListener('input', validateRecoveryPhrase);
            const nextSibling = input.nextElementSibling as HTMLElement;
            nextSibling.addEventListener('click', changeInputType);
        });
    }
}

function setRecoverPhaseTips(isValid: boolean, errMsg: string): void {
    const errorMessage = document.getElementById('error-message') as HTMLElement;
    const primaryButton = document.querySelector("#view-import-wallet .primary-button") as HTMLButtonElement;

    if (isValid) {
        errorMessage.style.display = 'none';
        primaryButton.disabled = false;
    } else {
        errorMessage.style.display = 'block';
        primaryButton.disabled = true;
    }
    errorMessage.innerText = errMsg;
}


function validateRecoveryPhrase(this: HTMLInputElement): void {
    const wordsArray = this.value.trim().split(/\s+/).filter(word => word.length > 0);
    let errMsg = '';
    let everyWordIsOk = true;
    const inputs = document.querySelectorAll<HTMLInputElement>("#recovery-phrase-inputs .recovery-phrase");
    const length = 12;
    // Number((document.getElementById('recovery-phrase-length') as HTMLInputElement).value);

    if (wordsArray.length === 1) {
        const mnemonic = wordsArray[0];
        if (!wordlist.includes(mnemonic)) {
            setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
            return;
        }

        const inputValues: string[] = [];
        inputs.forEach(input => {
            if (!input.value) {
                return;
            }

            const wordIsOk = wordlist.includes(input.value);
            if (!wordIsOk) {
                everyWordIsOk = false;
            }
            inputValues.push(input.value);
        });

        if (!everyWordIsOk) {
            setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
            return;
        }

        if (inputValues.length !== length) {
            setRecoverPhaseTips(false, "Secret Recovery Phrases contain 12words");
            return;
        }
        setRecoverPhaseTips(true, "");
        return;
    }

    if (wordsArray.length !== length) {
        errMsg = "Secret Recovery Phrases contain 12 words";
        setRecoverPhaseTips(false, errMsg);
        return;
    }

    for (let i = 0; i < length; i++) {
        inputs[i].value = wordsArray[i];
        const wordIsOk = wordlist.includes(wordsArray[i]);
        if (!wordIsOk) {
            everyWordIsOk = false;
        }
    }
    if (!everyWordIsOk) {
        setRecoverPhaseTips(false, "Invalid Secret Recovery Phrase");
        return;
    }
    const str = wordsArray.join(' ');
    const valid = validateMnemonic(str);
    if (!valid) {
        setRecoverPhaseTips(false, "Invalid Mnemonic String");
        return;
    }

    setRecoverPhaseTips(true, "");
}

function changeInputType(this: HTMLElement): void {
    const input = this.previousElementSibling as HTMLInputElement;
    if (input.type === "password") {
        input.type = "text";
        this.textContent = "🙈"; // Change button text to indicate hiding
    } else {
        input.type = "password";
        this.textContent = "👁"; // Change button text to indicate showing
    }
}

function prepareAccountData() {
    queryCurWallet().then((data) => {
        console.log("------>>> new account details:", data, data?.address.bmail_address)
        const address = data?.address.bmail_address;
        if (!address) {
            return
        }
        const walletAddrDiv = document.querySelector(".current-wallet-address-val") as HTMLElement;
        walletAddrDiv.innerText = address;
    })
}

function initMnemonicConfirmDiv(): void {
    const confirmPhraseBtn = document.querySelector("#view-confirm-recovery .primary-button") as HTMLButtonElement;
    confirmPhraseBtn.addEventListener('click', confirmUserInputPhrase);

    const confirmRecoverBtn = document.querySelector('#view-import-wallet .primary-button') as HTMLButtonElement;
    confirmRecoverBtn.addEventListener('click', confirmImportedWallet);
}

async function confirmUserInputPhrase(): Promise<void> {
    ___mnemonic_in_mem = null;
    sessionStorage.removeItem(__key_for_mnemonic_temp);
    // navigateTo('#onboarding/account-home');

    const wallet = await queryCurWallet();
    await freeActiveAccount(wallet?.address.bmail_address);
    navigateTo('#onboarding/account-success');
}

function confirmImportedWallet(): void {
    const inputs = document.querySelectorAll("#recovery-phrase-inputs .recovery-phrase") as NodeListOf<HTMLInputElement>;
    const inputValues: string[] = [];

    inputs.forEach(input => {
        inputValues.push(input.value);
    });

    const mnemonic = inputValues.join(' ');
    const valid = validateMnemonic(mnemonic);

    if (!valid) {
        alert("Invalid mnemonic data");
        return;
    }

    ___mnemonic_in_mem = mnemonic;
    sessionStorage.setItem(__key_for_mnemonic_temp, mnemonic);
    navigateTo('#onboarding/password-for-imported');
}

function initCreateSuccessDiv() {
    const parentDiv = document.getElementById("view-account-home") as HTMLButtonElement;
    const confirmBtn = parentDiv.querySelector(".confirm-button") as HTMLButtonElement;
    confirmBtn.addEventListener('click', buyVipMembership);

    const freeAccountBtn = parentDiv.querySelector(".confirm-button.free-active") as HTMLButtonElement;
    freeAccountBtn.addEventListener('click', async () => {
        await freeActiveAccount();
    });

    const allCards = parentDiv.querySelectorAll(".membership") as NodeListOf<HTMLElement>;
    allCards.forEach(membership => {
        membership.addEventListener("click", () => {
            membershipChanged(allCards, membership);
            if (membership.dataset.priceVal === 'false') {
                freeAccountBtn.style.display = 'block'
                confirmBtn.style.display = "none";
            } else {
                freeAccountBtn.style.display = 'none'
                confirmBtn.style.display = "block";
                confirmBtn.querySelector(".price-val-in-btn")!.textContent = membership.dataset.priceVal!;
                confirmBtn.dataset.priceVal = membership.dataset.priceVal;
            }
        })
    })
    allCards[0].click();
}

function membershipChanged(allCard: NodeListOf<HTMLElement>, current: HTMLElement) {
    allCard.forEach(card => {
        card.classList.remove("selected");
    });
    current.classList.add("selected");
}

let currentPriceVal = '0'

function buyVipMembership(e: MouseEvent): void {
    console.log("------>>>target:=>", e.target);
    const btn = e.target as HTMLElement;
    currentPriceVal = btn.dataset.priceVal ?? '0';
    console.log("------>>>price value:", currentPriceVal)
    navigateTo('#onboarding/buy-vip');
}

async function generateQrCodeForVipBuying() {
    if (currentPriceVal === '0') {
        navigateTo('#onboarding/account-home');
        return;
    }
    const qrUrl = await createQRCodeImg('我正在购买' + currentPriceVal + '元的会员');
    if (!qrUrl) {
        navigateTo('#onboarding/account-home');
        return;
    }

    const parentDiv = document.getElementById("view-buy-vip") as HTMLDivElement;
    const qrImg = parentDiv.querySelector("img");
    if (!qrImg) {
        return;
    }
    qrImg.src = qrUrl;
}

async function freeActiveAccount(address?: string) {
    const errorDiv = document.getElementById("account-home-error") as HTMLDivElement;
    errorDiv.style.display = "none";
    errorDiv.innerText = "";
    showLoading();
    try {
        if (!address) {
            const walletAddrDiv = document.querySelector(".current-wallet-address-val") as HTMLElement;
            address = walletAddrDiv.innerText;
        }

        if (!address) {
            console.log("------>>> no valid account address found")
            return
        }

        const payload: AccountOperation = AccountOperation.create({
            isDel: false,
            address: address
        });

        const message = AccountOperation.encode(payload).finish()
        const signature = await signDataByMessage(encodeHex(message));
        if (!signature) {
            throw new Error("sign data failed")
        }
        const srvRsp = await BMRequestToSrv("/account_create", address, message, signature)
        console.log("------->>>fetch success:=>", srvRsp);
        navigateTo('#onboarding/account-success');
    } catch (error) {
        console.log("------->>>fetch failed:=>", error);
        const errorDiv = document.getElementById("account-home-error") as HTMLDivElement;
        errorDiv.innerText = "fetch failed:" + error;
        errorDiv.style.display = "block";
    } finally {
        hideLoading();
    }
}


function showLoading(): void {
    document.body.classList.add('loading');
    document.getElementById("dialog-waiting-overlay")!.style.display = 'flex';
}

function hideLoading(): void {
    document.body.classList.remove('loading');
    document.getElementById("dialog-waiting-overlay")!.style.display = 'none';
}