// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmSession: 'bangumi_session',
};
const API = 'https://api.bgm.tv';

const WeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];

const weekdayRadios = document.querySelectorAll('input[name="calendar-weekday"]');

// VAR
let bgm_access_token = localStorage.getItem(LSKeys.bgmSession);

let calenderData = [];
let userData = {};
const CollectionsPreRequest = 20;
const collectionsDataList = [];

const calendarWrapperEle = document.getElementById('calendar_wrapper');
const collectionsWrapperEle = document.getElementById('collections_wrapper');

initCalendar();
initCollections();

async function initCalendar() { // Calendar
    calenderData = await request('/calendar', 'GET', false)
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
            calendarWrapperEle.innerHTML = dayObj['items'].map(obj => createItem(obj)).join('');
            break;
        }
    }
}

async function initCollections() { // Collections
    userData = await request('/v0/me', 'GET', true);
    collectionsDataList[0] = await request(`/v0/users/${userData['username']}/collections?limit=${CollectionsPreRequest}&offset=0`, 'GET', true);
    for (let i = 0; i < Math.floor(collectionsDataList[0]['total'] / CollectionsPreRequest); i++) {
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
        collectionsWrapperEle.innerHTML = collectionsDataList[offset]['data'].map(obj => createItem(obj['subject'])).join('');
    }
}

// public fn
async function request(url, method, withAuthorization) {
    const data = await fetch(API + url, withAuthorization ? {
        method: method,
        headers: new Headers({ 'Authorization': `Bearer ${bgm_access_token}` })
    } : { method: method });
    return await data.json();
}

function createItem(obj) {
    let res = `<a class="item" href="${obj['url']}" title="${obj['name_cn'] ? obj['name_cn'] + '\n' : ''}${obj['name']}\nID: ${obj['id']}">
    <img src="${obj['images']['large']}" alt="${obj['url']}">
    <div class="desp">`;

    res += obj['name_cn'] ? `<span class="cnname">${obj['name_cn']}</span><br>` : '';
    res += `<span class="name">${obj['name']}</span></div>`;
    res += obj['rank'] ? `<span class="rank">${obj['rank']}</span>` : '';
    res += obj['rating'] ? `<span class="score">${obj['rating']['score']}</span>` : '';
    res += '</a>';

    return res;
}

{ // Session
    let input = document.getElementById('session_inupt');
    input.addEventListener('change', function () {
        bgm_access_token = this.value;
        localStorage.setItem(LSKeys.bgmSession, this.value);
    })

    // init
    if (bgm_access_token !== '') {
        input.value = bgm_access_token;
    }
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