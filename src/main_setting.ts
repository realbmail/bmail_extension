import {hideLoading, isValidUrl, showLoading, showView} from "./utils";
import {showToastMessage} from "./main_common";
import {
    __officialContactSrv,
    addContactSrv,
    changeCurrentSrv,
    getAdminAddress,
    getSystemSetting,
    removeContractSrv
} from "./setting";
import {prepareDashboardElm} from "./main_dashboard";

export function initSetting() {
    const backBtn = document.getElementById("system-back-btn") as HTMLButtonElement;
    backBtn.addEventListener("click", () => {
        showView('#onboarding/main-dashboard');
    });

    const newItemBtn = document.getElementById("contact-server-add") as HTMLButtonElement;
    newItemBtn.addEventListener("click", addNewContactItem);

    const dropdownToggle = document.getElementById('dropdown-toggle') as HTMLButtonElement;
    const dropdownMenu = document.getElementById('server-dropdown-menu') as HTMLDivElement;
    dropdownToggle.addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });

    const container = document.getElementById("view-network-setting") as HTMLDivElement;

    container.addEventListener('click', (event) => {

        if (dropdownMenu.style.display === "none" ||
            dropdownToggle.contains(event.target as Node) ||
            dropdownMenu.contains(event.target as Node)) {
            return;
        }

        dropdownMenu.style.display = "none";
    });
}

export async function populateSystemSetting() {
    await populateServerMenu();
}

async function populateServerMenu() {
    const serverListElm = document.getElementById('contact-server-list') as HTMLDivElement;
    const dropdownMenu = serverListElm.querySelector('.dropdown-menu') as HTMLDivElement;
    const selectedItem = document.getElementById('selected-item') as HTMLSpanElement;
    const templateItem = document.getElementById('contact-server-item-template') as HTMLDivElement;

    dropdownMenu.innerHTML = '';
    const setting = await getSystemSetting();

    let selectedValue = setting.contactSrv;
    selectedItem.textContent = selectedValue;

    setting.contactList.forEach((item) => {
        const optionDiv = templateItem.cloneNode(true) as HTMLDivElement;
        optionDiv.style.display = 'flex';
        optionDiv.removeAttribute('id');

        const span = optionDiv.querySelector('.contact-server-item-val') as HTMLSpanElement;
        span.textContent = item;

        if (item === selectedValue) {
            optionDiv.classList.add('selected');
        }

        optionDiv.addEventListener('click', () => contactSrvChanged(item, selectedItem, dropdownMenu, optionDiv));

        const deleteButton = optionDiv.querySelector('.contact-server-item-del-btn') as HTMLButtonElement;
        if (item === __officialContactSrv) {
            deleteButton.style.display = 'none';
        } else {
            deleteButton.addEventListener('click', (event) => removeContactItem(event, item));
        }
        dropdownMenu.appendChild(optionDiv);
    });

    document.getElementById("contact-server-address")!.innerText = await getAdminAddress();
}

async function removeContactItem(event: MouseEvent, srv: string) {
    event.stopPropagation(); // 阻止点击事件冒泡到 optionDiv
    showLoading();
    try {
        const needUpdate = await removeContractSrv(srv);
        await populateServerMenu();
        if (needUpdate) {
            await prepareDashboardElm(true);
        }
        showToastMessage("remove success");
    } catch (e) {
        const err = e as Error;
        showToastMessage(err.message);
    } finally {
        hideLoading();
    }
}

async function addNewContactItem() {
    const contactSrvInput = document.getElementById('contact-server-val') as HTMLInputElement;
    const serverAddress = contactSrvInput.value;

    if (!isValidUrl(serverAddress)) {
        showToastMessage("invalid url value");
        return;
    }
    showLoading();
    try {
        await addContactSrv(serverAddress);
        await populateServerMenu();
        contactSrvInput.value = '';
        showToastMessage("add success");
    } catch (e) {
        const err = e as Error;
        showToastMessage(err.message);
    } finally {
        hideLoading();
    }
}

async function contactSrvChanged(selectedValue: string, selectedItem: HTMLSpanElement,
                                 dropdownMenu: HTMLDivElement, optionDiv: HTMLDivElement) {
    showLoading();
    try {
        selectedItem.textContent = selectedValue;
        dropdownMenu.style.display = 'none';
        dropdownMenu.querySelectorAll('.contact-server-item').forEach(el => el.classList.remove('selected'));
        optionDiv.classList.add('selected');
        await changeCurrentSrv(selectedValue);
        await prepareDashboardElm(true);
    } catch (e) {
        const err = e as Error;
        showToastMessage(err.message);
    } finally {
        hideLoading();
    }
}
