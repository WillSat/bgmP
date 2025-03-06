// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmAccessToken: 'bangumi_access_token',
    bgmUserData: 'bangumi_user_data',
    displayCollectionsTypeArr: 'display_collections_type_arr'
};
const baseUrl = 'https://api.bgm.tv';

// ["grid", "small", "common", "medium", "large"];
const CalendarImageQuality = 'large';
const CollectionsImageQuality = 'grid';

// VAR
let accessToken = localStorage.getItem(LSKeys.bgmAccessToken);
let userData = JSON.parse(localStorage.getItem(LSKeys.bgmUserData));
let cachedCheckedCollArr = JSON.parse(localStorage.getItem(LSKeys.displayCollectionsTypeArr)) ?? [3, 1];
let collectionsDataList = [];
const collectionsPreRequest = 100;

const calendarWrapperEle = document.getElementById('calendar_wrapper');
const collectionsWrapperEle = document.getElementById('collections_wrapper');
const blurLayer = document.getElementById('blur_layer');

initCalendar();
initCollections();

let selectedCollID;

async function initCalendar() { // Calendar
    const WeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];
    const weekdayRadios = document.querySelectorAll('input[name="calendar-weekday"]');

    let calenderData = await (await request('/calendar', 'GET', false)).json();
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
            calendarWrapperEle.innerHTML = dayObj['items'].map(obj => createImageItems(obj)).join('');
            break;
        }
    }
}

// Collections
async function initCollections(isRefresh) {
    if (!accessToken) {
        // log out
        collectionsWrapperEle.innerHTML = '';
        return;
    }
    if (!userData || isRefresh) await refreshUserData();
    const firstResqust = await ((await request(`/v0/users/${userData['username']}/collections?limit=${collectionsPreRequest}&offset=0`, 'GET', true)).json());

    const totalPages = Math.ceil(firstResqust['total'] / collectionsPreRequest);
    collectionsDataList.push(...firstResqust['data']);

    for (let offset = 1; offset < totalPages; offset++) {
        const res = (await (await request(`/v0/users/${userData['username']}/collections?limit=${collectionsPreRequest}&offset=${offset * collectionsPreRequest}`, 'GET', true)).json())['data'];
        collectionsDataList.push(...res);
    }

    // init
    const collectionType = document.querySelectorAll('input[name="collection-type"]');

    
    randerCollections(cachedCheckedCollArr);
    for (const ele of collectionType) {
        if (cachedCheckedCollArr.includes(+ele.value)) ele.checked = true;
        else ele.checked = false;
    }

    // change event
    collectionType.forEach(ele => {
        ele.addEventListener('change', () => {
            const checkedTypeArr = [];
            for (const ele of collectionType) {
                if (ele.checked) checkedTypeArr.push(+ele.value);
            }
            randerCollections(checkedTypeArr);
            cachedCheckedCollArr = checkedTypeArr;
            localStorage.setItem(LSKeys.displayCollectionsTypeArr, JSON.stringify(checkedTypeArr));
        })
    });
}

function randerCollections(typeArr) {
    collectionsWrapperEle.innerHTML = '';

    const randerGroup = (subtitle, children) =>
        collectionsWrapperEle.innerHTML += `<div class="list_subtitle">${subtitle}</div><div class="list_group">${children}</div>`;

    for (const type of typeArr) {
        randerGroup([null, '想看', '看过', '在看', '搁置', '抛弃'][type],
            collectionsDataList.filter(e => e['type'] === type).map(obj => createListItems(obj['subject'])).join('')
        );
    }

    for (const a of document.querySelectorAll('a.list_items')) {
        a.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            openCollMenu(this.getAttribute('collitemid'));
        })
    }
}

function openCollMenu(itemID) {
    blurLayer.classList.add('open');
    selectedCollID = +itemID;
}

// public fn
async function request(url, method, withAuthorization, body) {
    const options = { method };
    if (withAuthorization) options['headers'] = new Headers({
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': "application/json"
    });
    if (body) options['body'] = JSON.stringify(body);

    return await fetch(baseUrl + url, options);
}

async function refreshUserData(isRandering) {
    const res = await ((await request('/v0/me', 'GET', true)).json());
    if (res['id']) {
        userData = res;
        localStorage.setItem(LSKeys.bgmUserData, JSON.stringify(userData));

        if (isRandering) initCollections();
    }
}

function createImageItems(obj) {
    const score = obj['rating'] ? obj['rating']['score'] : false;

    let eleTitle = `${obj['name_cn'] ? obj['name_cn'] + '\n' : ''}${obj['name']}\nID: ${obj['id']}`
    eleTitle += obj['rank'] ? `\n排名：${obj['rank']}` : '';
    eleTitle += score ? `\n评分：${score}` : '';

    let res = `<a class="image_items" href="${obj['url'] ?? `http://bgm.tv/subject/${obj['id']}`}" title="${eleTitle}">
    <img src="${obj['images'][CalendarImageQuality]}" alt="${obj['url']}">
    <div class="desp">`;

    res += obj['name_cn'] && obj['name_cn'] !== obj['name']
        ? `<div class="cnname">${obj['name_cn']}</div>` : '';
    res += `<div class="name">${obj['name']}</div></div>`;
    res += obj['rank'] ? `<div class="rank">${obj['rank']}</div>` : '';
    res += score ? `<div class="score">${score}</div>` : '';
    res += '</a>';

    return res;
}

function createListItems(subject) {
    const quality = subject['score'] ? subject['score'] < 7 ? 'normal' : subject['score'] < 8 ? 'high' : 'ex-high' : 'none';
    let eleTitle = `${subject['name_cn'] ? subject['name_cn'] + '\n' : ''}${subject['name']}\nID: ${subject['id']}`
    eleTitle += subject['rank'] ? `\n排名：${subject['rank']}` : '';
    eleTitle += subject['score'] ? `\n评分：${subject['score']}` : '';

    let res = `<a class="list_items" href="${subject['url'] ?? `http://bgm.tv/subject/${subject['id']}`}" title="${eleTitle}" quality="${quality}" collitemid="${subject['id']}">
    <img src="${subject['images'][CollectionsImageQuality]}" alt="${subject['url']}">
    <div class="desp">`;

    res += subject['name_cn'] && subject['name_cn'] !== subject['name']
        ? `<div class="cnname">${subject['name_cn']}</div>` : '';
    res += `<div class="name">${subject['name']}</div></div>`;

    res += '<div class="tail">';
    res += subject['rank'] ? `<div class="rank">${subject['rank']}</div>` : '';
    res += subject['score'] ? `<div class="score">${subject['score']}</div>` : '';
    res += '</div>';
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
        collectionsDataList = [];
        initCollections(true);
    })
}

{
    blurLayer.addEventListener('click', () => {
        blurLayer.classList.remove('open');
    });

    for (const ele of document.querySelectorAll('.box_item')) {
        ele.addEventListener('click', async function (e) {
            if (!selectedCollID) return;
            try {
                await request(
                    `/v0/users/-/collections/${selectedCollID}`,
                    'POST', true,
                    { type: +this.getAttribute('value') }
                );

                for (let i = 0; i < collectionsDataList.length; i++) {
                    if (collectionsDataList[i]['subject_id'] === selectedCollID) {
                        collectionsDataList[i]['type'] = +this.getAttribute('value');
                        randerCollections(cachedCheckedCollArr);
                        break;
                    }
                }
            } catch (error) {
                console.error(error);
            }
        })
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