// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmAccessToken: 'bangumi_access_token',
    bgmUserData: 'bangumi_user_data'
};
const API = 'https://api.bgm.tv';

// ["grid", "small", "common", "medium", "large"];
const CalendarImageQuality = 'large';
const CollectionsImageQuality = 'medium';

// VAR
let accessToken = localStorage.getItem(LSKeys.bgmAccessToken);
let userData = JSON.parse(localStorage.getItem(LSKeys.bgmUserData));
const collectionsPreRequest = 30;
const collectionsDataList = [];

const calendarWrapperEle = document.getElementById('calendar_wrapper');
const collectionsWrapperEle = document.getElementById('collections_wrapper');

initCalendar();
initCollections();

async function initCalendar() { // Calendar
    const WeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];
    const weekdayRadios = document.querySelectorAll('input[name="calendar-weekday"]');

    let calenderData = await request('/calendar', 'GET', false);
    randerCalender(calenderData, WeekDay);

    // switch event
    weekdayRadios.forEach(ele => {
        if (WeekDay === +ele.value) {
            ele.checked = true;
        }
        ele.addEventListener('change', () => {
            for (const ele of weekdayRadios) {
                if (ele.checked) {
                    randerCalender(calenderData, +ele.value);
                    break;
                }
            }
        })
    });

    function randerCalender(arr, id) {
        if (arr.length === 0) {
            console.error('Get calendar data failed!');
            return;
        }

        for (const dayObj of arr) {
            if (dayObj['weekday']['id'] !== id) continue;
            // rander
            calendarWrapperEle.innerHTML = dayObj['items'].map(obj => createItem(obj, 0)).join('');
            break;
        }
    }
}

async function initCollections(isRefresh) { // Collections
    if (!accessToken) {
        collectionsWrapperEle.innerHTML = '';
        return;
    }
    if (!userData || isRefresh) await refreshUserData();
    collectionsDataList[0] = await request(`/v0/users/${userData['username']}/collections?limit=${collectionsPreRequest}&offset=0`, 'GET', true);
    for (let i = 0; i < Math.floor(collectionsDataList[0]['total'] / collectionsPreRequest); i++) {
        // sign: exists but not be requested yet
        collectionsDataList[i + 1] = false;
    }
    collectionsDataList[0]
    await randerCollections(0);

    async function randerCollections(offset) {
        if (collectionsDataList[offset] || collectionsDataList[offset] === false) {
            collectionsDataList[offset] = await request(`/v0/users/${userData['username']}/collections?limit=20&offset=${offset}`, 'GET', true);
        }

        // rander
        collectionsWrapperEle.innerHTML = collectionsDataList[offset]['data'].map(obj => createItem(obj['subject'], 1)).join('');
    }
}

// public fn
async function request(url, method, withAuthorization) {
    const data = await fetch(API + url, withAuthorization ? {
        method: method,
        headers: new Headers({ 'Authorization': `Bearer ${accessToken}` })
    } : { method: method });
    return await data.json();
}

async function refreshUserData(isRandering) {
    const res = await request('/v0/me', 'GET', true);
    if (res['id']) {
        userData = res;
        localStorage.setItem(LSKeys.bgmUserData, JSON.stringify(userData));

        if (isRandering) initCollections();
    }
}

// calendar: 0, collections: 1
function createItem(obj, itemType) {
    const score = obj['rating'] ? obj['rating']['score'] :
        obj['score'] ? obj['score'] : false;

    let eleTitle = `${obj['name_cn'] ? obj['name_cn'] + '\n' : ''}${obj['name']}\nID: ${obj['id']}`
    eleTitle += obj['rank'] ? `\n排名：${obj['rank']}` : '';
    eleTitle += score ? `\n评分：${score}` : '';

    let res = `<a class="item" href="${obj['url'] ?? `http://bgm.tv/subject/${obj['id']}`}" title="${eleTitle}">
    <img src="${obj['images'][[CalendarImageQuality, CollectionsImageQuality][itemType]]}" alt="${obj['url']}">
    <div class="desp">`;

    res += obj['name_cn'] && obj['name_cn'] !== obj['name']
        ? `<span class="cnname">${obj['name_cn']}</span><br>` : '';
    res += `<span class="name">${obj['name']}</span></div>`;
    res += obj['rank'] ? `<span class="rank">${obj['rank']}</span>` : '';
    res += score ? `<span class="score">${score}</span>` : '';
    res += '</a>';

    return res;
}

{ // Access Token
    const input = document.getElementById('access_token_inupt');
    // init
    if (accessToken !== null) {
        input.value = accessToken;
    }

    input.addEventListener('change', function () {
        accessToken = this.value;
        localStorage.setItem(LSKeys.bgmAccessToken, accessToken);

        // refresh
        initCollections(true);
    })
}

{ // Search
    let input = document.getElementById('search_input');
    let btn = document.getElementById('search_btn');

    btn.addEventListener('click', () => {
        print(input.value);
    });
}

function print(msg) {
    console.log(msg);
}