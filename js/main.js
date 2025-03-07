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
const collectionsPreRequest = 100;

// VAR
let accessToken = localStorage.getItem(LSKeys.bgmAccessToken);
let userData = JSON.parse(localStorage.getItem(LSKeys.bgmUserData));
let cachedCheckedCollArr = JSON.parse(localStorage.getItem(LSKeys.displayCollectionsTypeArr)) ?? [3, 1];
let calenderDataList = [];
let collectionsDataList = [];

const calendarWrapperEle = document.getElementById('calendar_wrapper');
const collectionsWrapperEle = document.getElementById('collections_wrapper');
const blurLayer = document.getElementById('blur_layer');

initCalendar();
initCollections();

let selectedCollID;

function buildStructData(id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType) {
    return { id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType };
}

async function initCalendar() { // Calendar
    const todayWeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];
    const weekdayRadios = document.querySelectorAll('input[name="calendar-weekday"]');

    const resData = await (await request('/calendar', 'GET', false)).json();
    for (const dayObj of resData) {
        const dayCode = dayObj['weekday']['id'];
        for (const items of dayObj['items']) {
            calenderDataList.push(buildStructData(
                items['id'], items['name'], items['name_cn'], items['images'][CalendarImageQuality], items['rank'], items['rating'] ? items['rating']['score'] : false, dayCode
            ));
        }
    }

    randerCalender(todayWeekDay);

    // switch event
    weekdayRadios.forEach(ele => {
        if (todayWeekDay === +ele.value) {
            ele.checked = true;
        }
        ele.addEventListener('change', () => {
            for (const ele of weekdayRadios) {
                if (ele.checked) {
                    randerCalender(+ele.value);
                    break;
                }
            }
        })
    });
}

function randerCalender(dayCode) {
    if (calenderDataList.length === 0) {
        console.error('Get calendar data failed!');
        return;
    }

    const tempArr = calenderDataList.filter(e => e.playWeekDayCode === dayCode);

    // rander
    calendarWrapperEle.innerHTML = tempArr.map(o => createImageItems(o)).join('');

    // bind event
    for (const a of document.querySelectorAll('a.image_items')) {
        a.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            openCollOptionsMenu(+this.getAttribute('id'));
        })
    }

    // const score = obj['rating'] ? obj['rating']['score'] : false;
    function createImageItems(structData) {
        let eleTitle = `${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`
        eleTitle += structData.rank ? `\n排名：${structData.rank}` : '';
        eleTitle += structData.score ? `\n评分：${structData.score}` : '';

        let res = `<a class="image_items" href="http://bgm.tv/subject/${structData.id}" title="${eleTitle}" id="${structData.id}">
        <img src="${structData.imgUrl}" alt="${structData.imgUrl}">
        <div class="desp">`;

        res += structData.nameCn && structData.nameCn !== structData.name
            ? `<div class="cnname">${structData.nameCn}</div>` : '';
        res += `<div class="name">${structData.name}</div></div>`;
        res += structData.rank ? `<div class="rank">${structData.rank}</div>` : '';
        res += structData.score ? `<div class="score">${structData.score}</div>` : '';
        res += '</a>';

        return res;
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

    pushData(firstResqust['data']);

    const totalPages = Math.ceil(firstResqust['total'] / collectionsPreRequest);
    for (let offset = 1; offset < totalPages; offset++) {
        const res = await (await request(`/v0/users/${userData['username']}/collections?limit=${collectionsPreRequest}&offset=${offset * collectionsPreRequest}`, 'GET', true)).json();

        pushData(res['data']);
    }

    function pushData(rawArr) {
        for (const obj of rawArr) {
            const subject = obj['subject'];
            collectionsDataList.push(buildStructData(
                subject['id'], subject['name'], subject['name_cn'], subject['images'][CollectionsImageQuality], subject['rank'], subject['score'], undefined, obj['type']
            ));
        }
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
        randerGroup(
            [null, '想看', '看过', '在看', '搁置', '抛弃'][type],
            collectionsDataList.filter(e => e.inCollType === type).map(obj => createListItems(obj)).join('')
        );
    }

    // bind event
    for (const a of document.querySelectorAll('a.list_items')) {
        a.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            openCollOptionsMenu(+this.getAttribute('collitemid'));
        })
    }

    function createListItems(structData) {
        const quality = structData.score ? structData.score < 7 ? 'normal' : structData.score < 8 ? 'high' : 'ex-high' : 'none';
        let eleTitle = `${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`
        eleTitle += structData.rank ? `\n排名：${structData.rank}` : '';
        eleTitle += structData.score ? `\n评分：${structData.score}` : '';

        let res = `<a class="list_items" href="http://bgm.tv/subject/${structData.id}" title="${eleTitle}" quality="${quality}" collitemid="${structData.id}">
        <img src="${structData.imgUrl}" alt="${structData.id}">
        <div class="desp">`;

        res += structData.nameCn && structData.nameCn !== structData.name
            ? `<div class="cnname">${structData.nameCn}</div>` : '';
        res += `<div class="name">${structData.name}</div></div>`;

        res += '<div class="tail">';
        res += structData.rank ? `<div class="rank">${structData.rank}</div>` : '';
        res += structData.score ? `<div class="score">${structData.score}</div>` : '';
        res += '</div>';
        res += '</a>';

        return res;
    }
}

function openCollOptionsMenu(itemID) {
    ifSelectedCollInCollections = collectionsDataList.some(e => e.id === itemID);
    selectedCollID = itemID;
    blurLayer.classList.add('open');
    
    window.menu_timer = setTimeout(closeCollOptionsMenu, 60 * 1000);
}

function closeCollOptionsMenu() {
    blurLayer.classList.remove('open');
    selectedCollID = null;
    if (window.menu_timer) clearTimeout(window.menu_timer);
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
    blurLayer.addEventListener('click', closeCollOptionsMenu);

    for (const ele of document.querySelectorAll('.box_item')) {
        ele.addEventListener('click', async function (e) {
            e.stopPropagation();
            if (!selectedCollID) return;

            // 0: open in bgm.tv
            if (+this.getAttribute('value') === 0) {
                window.open(`https://bgm.tv/subject/${selectedCollID}`);
                return;
            }

            try {
                await request(
                    `/v0/users/-/collections/${selectedCollID}`,
                    'POST', true,
                    { type: +this.getAttribute('value') }
                );

                const ii = collectionsDataList.findIndex(item => item.id === selectedCollID);
                if (ii !== -1) {
                    collectionsDataList[ii].inCollType = +this.getAttribute('value');
                    randerCollections(cachedCheckedCollArr);
                } else {
                    const index = calenderDataList.findIndex(item => item.id === selectedCollID);
                    calenderDataList[index].inCollType = +this.getAttribute('value');
                    collectionsDataList.push(calenderDataList[index]);
                    randerCollections(cachedCheckedCollArr);
                }

            } catch (error) {
                console.error(error);
            }

            closeCollOptionsMenu();
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