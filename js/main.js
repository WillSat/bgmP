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
const ListImageQuality = 'grid';
const CollectionsPreRequest = 100;
const SearchResultPreRequest = 25;

// VAR
let accessToken = localStorage.getItem(LSKeys.bgmAccessToken);
let userData = JSON.parse(localStorage.getItem(LSKeys.bgmUserData));
let cachedCheckedCollArr = JSON.parse(localStorage.getItem(LSKeys.displayCollectionsTypeArr)) ?? [3, 1];
let calenderDataList = [];
let collectionsDataList = [];

const calendarWrapperEle = document.getElementById('calendar_wrapper');
const collectionsWrapperEle = document.getElementById('collections_wrapper');
const detailLayer = document.getElementById('detail_layer');

const detailContainer = document.getElementById('detail_container'),
    detailBlurBg = document.getElementById('detail_blurbg'),
    closeMenuBtn = detailLayer.querySelector('.close_btn'),
    detailEle = document.getElementById('item_detail'),
    detailTitle = document.querySelector('#detail_title > span'),
    detailCover = document.getElementById('item_detail_cover'),
    detailInfo = document.getElementById('item_detail_info'),
    detailCnname = document.getElementById('item_detail_cnname'),
    detailName = document.getElementById('item_detail_name'),
    detailDesp = document.getElementById('item_detail_desp'),
    detailRankScore = document.getElementById('item_detail_rankscore');

const loadingLayer = document.getElementById('loading_layer');
const loadingBox = document.getElementById('loading_box');

initCalendar();
initCollections();

let rawDataofSelectedItem;

function buildStructData(id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType) {
    return { id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType };
}

function sortStructData(a, b) {
    if (a.rank && b.rank) return a.rank > b.rank;
    else return b.rank;
}

async function initCalendar() { // Calendar
    startLoading();
    const todayWeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];
    const weekdayRadios = document.querySelectorAll('input[name="calendar-weekday"]');

    const resData = await (await request('/calendar', 'GET', false)).json();
    for (const dayObj of resData) {
        const dayCode = dayObj['weekday']['id'];
        for (const items of dayObj['items']) {
            calenderDataList.push(buildStructData(
                items['id'], items['name'], items['name_cn'], items['images'] ? items['images'][CalendarImageQuality] ?? '' : '', items['rank'], items['rating'] ? items['rating']['score'] : false, dayCode
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
    loadFinished();
}

function randerCalender(dayCode) {
    if (calenderDataList.length === 0) {
        console.error('Get calendar data failed!');
        return;
    }

    const tempArr = calenderDataList.filter(e => e.playWeekDayCode === dayCode).toSorted(sortStructData);

    // rander
    calendarWrapperEle.innerHTML = '';
    for (const o of tempArr) {
        calendarWrapperEle.appendChild(createImageItems(o));
    }

    // bind event
    for (const a of document.querySelectorAll('#calendar_wrapper a.image_items')) {
        a.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            openCollOptionsMenu(a.rawData);
        })
        a.addEventListener('click', function (e) {
            e.preventDefault();
            openCollOptionsMenu(a.rawData);
        })
    }

    // const score = obj['rating'] ? obj['rating']['score'] : false;
    function createImageItems(structData) {
        let eleTitle = `${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`
        eleTitle += structData.rank ? `\n排名：${structData.rank}` : '';
        eleTitle += structData.score ? `\n评分：${structData.score}` : '';

        const aEle = document.createElement('a');
        aEle.classList.add('image_items');
        // aEle.href = `http://bgm.tv/subject/${structData.id}`;
        aEle.title = eleTitle;
        aEle.rawData = structData;

        const imgEle = document.createElement('img');
        imgEle.src = structData.imgUrl;
        imgEle.alt = structData.id;
        aEle.appendChild(imgEle);

        const despEle = document.createElement('div');
        despEle.classList.add('desp');
        despEle.innerHTML = structData.nameCn && structData.nameCn !== structData.name
            ? `<div class="cnname">${structData.nameCn}</div>` : '';
        despEle.innerHTML += `<div class="name">${structData.name}</div>`;
        aEle.appendChild(despEle);

        if (structData.rank) {
            const rankEle = document.createElement('div');
            rankEle.classList.add('rank');
            rankEle.innerHTML = structData.rank;
            aEle.appendChild(rankEle);
        }

        if (structData.score) {
            const scoreEle = document.createElement('div');
            scoreEle.classList.add('score');
            scoreEle.innerHTML = structData.score;
            aEle.appendChild(scoreEle);
        }
        return aEle;
    }
}

// Collections
async function initCollections(isRefresh) {
    startLoading();
    if (!accessToken) {
        // log out
        collectionsWrapperEle.innerHTML = '';
        return;
    }
    if (!userData || isRefresh) await refreshUserData();
    const firstResqust = await ((await request(`/v0/users/${userData['username']}/collections?limit=${CollectionsPreRequest}&offset=0`, 'GET', true)).json());

    pushData(firstResqust['data']);

    const totalPages = Math.ceil(firstResqust['total'] / CollectionsPreRequest);
    for (let offset = 1; offset < totalPages; offset++) {
        const res = await (await request(`/v0/users/${userData['username']}/collections?limit=${CollectionsPreRequest}&offset=${offset * CollectionsPreRequest}`, 'GET', true)).json();

        pushData(res['data']);
    }

    function pushData(rawArr) {
        for (const obj of rawArr) {
            const subject = obj['subject'];
            collectionsDataList.push(buildStructData(
                subject['id'], subject['name'], subject['name_cn'], subject['images'] ? subject['images'][ListImageQuality] ?? '' : '', subject['rank'], subject['score'], undefined, obj['type']
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
    collectionType.forEach(a => {
        a.addEventListener('change', () => {
            const checkedTypeArr = [];
            for (const ele of collectionType) {
                if (ele.checked) checkedTypeArr.push(+ele.value);
            }
            randerCollections(checkedTypeArr);
            cachedCheckedCollArr = checkedTypeArr;
            localStorage.setItem(LSKeys.displayCollectionsTypeArr, JSON.stringify(checkedTypeArr));
        })
    });
    loadFinished();
}

function randerCollections(typeArr) {
    collectionsWrapperEle.innerHTML = '';

    // rander
    for (const type of typeArr) {
        const tempArr = collectionsDataList.filter(e => e.inCollType === type).toSorted(sortStructData).map(obj => createListItems(obj));
        randerGroup(
            `${[null, '想看', '看过', '在看', '搁置', '抛弃'][type]} · ${tempArr.length}`,
            tempArr,
            collectionsWrapperEle
        );
    }

    // bind contextmenu event
    for (const a of document.querySelectorAll('#collections_wrapper a.list_item')) {
        a.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openCollOptionsMenu(a.rawData);
        })
        a.addEventListener('click', (e) => {
            e.preventDefault();
            openCollOptionsMenu(a.rawData);
        })
    }
}

function randerGroup(subtitle, children, parentEle) {
    const subtitleEle = document.createElement('div');
    subtitleEle.classList.add('list_subtitle');
    subtitleEle.innerHTML = subtitle;
    parentEle.appendChild(subtitleEle);

    const scollWrapper = document.createElement('div');
    scollWrapper.classList.add('scoll_wrapper');
    const groupEle = document.createElement('div');
    groupEle.classList.add('list_group');
    for (const o of children) {
        groupEle.appendChild(o);
    }
    scollWrapper.appendChild(groupEle);
    parentEle.appendChild(scollWrapper);
}

function createListItems(structData) {
    const quality = structData.score ? structData.score < 7 ? 'normal' : structData.score < 8 ? 'high' : 'ex-high' : 'normal';

    const eleTitle = [`${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`];
    eleTitle.push(structData.rank ? `\n排名：${structData.rank}` : '');
    eleTitle.push(structData.score ? `\n评分：${structData.score}` : '');

    const aEle = document.createElement('a');
    aEle.classList.add('list_item');
    aEle.setAttribute('quality', quality);
    // aEle.href = `http://bgm.tv/subject/${structData.id}`;
    aEle.title = `${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`;
    aEle.rawData = structData;

    const imgEle = document.createElement('img');
    imgEle.src = structData.imgUrl;
    imgEle.alt = structData.id;
    aEle.appendChild(imgEle);

    const despEle = document.createElement('div');
    despEle.classList.add('desp');
    despEle.innerHTML = structData.nameCn && structData.nameCn !== structData.name
        ? `<div class="cnname">${structData.nameCn}</div>` : '';
    despEle.innerHTML += `<div class="name">${structData.name}</div></div>`;
    aEle.appendChild(despEle);

    if (structData.rank || structData.rank) {
        const tailEle = document.createElement('div');
        tailEle.classList.add('tail');

        if (structData.rank) {
            const rankEle = document.createElement('div');
            rankEle.classList.add('rank');
            rankEle.innerHTML = structData.rank;
            tailEle.appendChild(rankEle);
        }

        if (structData.score) {
            const scoreEle = document.createElement('div');
            scoreEle.classList.add('score');
            scoreEle.innerHTML = structData.score;
            tailEle.appendChild(scoreEle);
        }

        aEle.appendChild(tailEle);
    }

    return aEle;
}

async function openCollOptionsMenu(rawData) {
    if (window.mune_opening) return;
    startLoading();
    window.mune_opening = true;

    if (window.clear_menu_timer) clearTimeout(window.clear_menu_timer);

    const detailData = await (await request(`/v0/subjects/${rawData.id}`, 'GET', false, null)).json();

    const detailObj = getItemDetail(detailData);

    const summary = (detailObj.summary && detailObj.summary !== '') ? detailObj.summary.trim() : false;
    // Remove duplicates
    const metaTags = [...(new Set(detailObj.metaTags))].map(e => wordBlock(e, 'META', null, 'tag'));
    const tags = (detailObj.tags ?? []).filter(e => e.count > 1).map(e => wordBlock(e.name, e.count, null, 'tag'));
    const infoBox = (detailObj.infobox ?? []).map(e => wordBlock((typeof(e.value) === 'string' ? e.value : JSON.stringify(e.value)), null, e.key, 'info'));

    detailDesp.innerHTML = [
        detailObj.date ? wordBlock(detailObj.date, null, '放送开始') : '',
        detailObj.totalEpisodes ? wordBlock(detailObj.totalEpisodes, null, '话数') : '',
        detailObj.platform ? wordBlock(detailObj.platform, null, '平台') : '',
        wordBlock(rawData.id, null, 'ID'),
        '<br>',
        metaTags.join(''),
        metaTags.length !== 0 ? '<br>' : '',
        tags.join(''),
        tags.length !== 0 ? '<br>' : '',
        summary ? wordBlock(summary, null, '简介') : '',
        summary ? '<br>' : '',
        infoBox.join('<br>'),
    ].join('');

    detailCover.src = detailBlurBg.src = rawData.imgUrl;
    detailCover.alt = detailBlurBg.alt = rawData.id;
    detailCnname.textContent = rawData.nameCn;
    detailName.textContent = detailTitle.textContent = rawData.name;

    if (rawData.rank && rawData.score) {
        detailRankScore.innerHTML = `${wordBlock(rawData.rank, null, '排名') + wordBlock(rawData.score, null, '评分')}`;
    } else if (rawData.rank) {
        detailRankScore.innerHTML = wordBlock(rawData.rank, null, '排名');
    } else if (rawData.score) {
        detailRankScore.innerHTML = wordBlock(rawData.score, null, '评分');
    }

    rawDataofSelectedItem = rawData;
    detailLayer.classList.add('open');

    window.mune_opening = false;

    function wordBlock(content, tail, head, className) {
        return `<div class="word_block ${className ?? ''}">${head ? `<span class="word_block_head">${head}</span>` : ''}${content}${tail ? `<sup class="word_block_tail">${tail}</sup>` : ''}</div>`;
    }

    function getItemDetail(data) {
        return {
            date: data['date'],
            // date: String
            platform: data['platform'],
            // platform: String
            metaTags: data['meta_tags'],
            // meta_tags: [ String ]
            tags: data['tags'],
            // tags: [{ "name", "count", "total_cont" }]
            totalEpisodes: data['total_episodes'],
            // total_episodes: int
            infobox: data['infobox'],
            // infobox: [{ "key", "value" }]
            summary: data['summary']
            // summary: String
        };
    }
    loadFinished();
}

function closeCollOptionsMenu() {
    detailLayer.classList.remove('open');

    window.clear_menu_timer = setTimeout(() => {
        detailCover.src = detailBlurBg.src = '';
        detailCover.alt = detailBlurBg.alt = '';
        detailTitle.textContent = '';
        detailCnname.textContent = '';
        detailName.textContent = '';
        detailDesp.innerHTML = '';
        detailRankScore.innerHTML = '';
    }, 300);

    rawDataofSelectedItem = null;
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
    detailLayer.addEventListener('click', closeCollOptionsMenu);

    detailContainer.addEventListener('click', e => e.stopPropagation());

    closeMenuBtn.addEventListener('click', closeCollOptionsMenu);

    for (const ele of document.querySelectorAll('#menu_box div.box_item')) {
        ele.addEventListener('click', async function (e) {
            e.stopPropagation();
            if (!rawDataofSelectedItem || !rawDataofSelectedItem.id) return;
            
            // 0: open in bgm.tv
            if (+this.getAttribute('value') === 0) {
                window.open(`https://bgm.tv/subject/${rawDataofSelectedItem.id}`);
                closeCollOptionsMenu();
                return;
            }
            
            startLoading();

            try {
                await request(
                    `/v0/users/-/collections/${rawDataofSelectedItem.id}`,
                    'POST', true,
                    { type: +this.getAttribute('value') }
                );

                const ii = collectionsDataList.findIndex(item => item.id === rawDataofSelectedItem.id);
                if (ii !== -1) {
                    collectionsDataList[ii].inCollType = +this.getAttribute('value');
                    randerCollections(cachedCheckedCollArr);
                } else {
                    rawDataofSelectedItem.inCollType = +this.getAttribute('value');
                    collectionsDataList.push(rawDataofSelectedItem);
                    randerCollections(cachedCheckedCollArr);
                }

            } catch (error) {
                console.error(error);
            }

            closeCollOptionsMenu();
            loadFinished();
        })
    }
}

{ // Search
    const input = document.getElementById('search_input');
    const btn = document.getElementById('search_btn');
    const searchResultsCard = document.getElementById('search_results');
    const searchResultsWrapper = document.getElementById('search_results_wrapper');

    function openSearchResult(children) {
        searchResultsWrapper.innerHTML = '';

        randerGroup(`<div>“${input.value}” · ${children.length}</div><img class="close_btn" src="img/close.svg" alt="">`, children, searchResultsWrapper);
        searchResultsWrapper.querySelector('.close_btn').addEventListener('click', closeSearchResult);

        // bind contextmenu event
        for (const a of document.querySelectorAll('#search_results a.list_item')) {
            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openCollOptionsMenu(a.rawData);
            })
            a.addEventListener('click', (e) => {
                e.preventDefault();
                openCollOptionsMenu(a.rawData);
            })
        }

        searchResultsCard.classList.remove('hidden');
        setTimeout(() => searchResultsCard.classList.remove('close'), 100);
    }

    function closeSearchResult() {
        searchResultsCard.classList.add('close');

        setTimeout(() => {
            searchResultsCard.classList.add('hidden');
            searchResultsWrapper.innerHTML = '';
        }, 600);
    }

    btn.addEventListener('click', () => {
        if (!input.value) {
            input.focus();
            return;
        }

        startLoading();

        request(
            `/search/subject/${input.value}?type=2&responseGroup=large&max_results=${SearchResultPreRequest}`,
            'GET',
            false
        ).then(r => r.json()).then(data => {
            const tempArr = [];
            for (const obj of data['list']) {
                const inCollType = collectionsDataList.find(e => e.id === obj['id'])?.inCollType ?? 0;
                tempArr.push(
                    createListItems(buildStructData(
                        obj['id'], obj['name'], obj['name_cn'], obj['images'] ? obj['images'][ListImageQuality] ?? '' : '', obj['rank'], obj['rating'] ? obj['rating']['score'] : false, obj['air_weekday'], inCollType
                    ))
                )
            }
            openSearchResult(tempArr);
            loadFinished();
        })
    });
}

function startLoading() {
    if (window.loading_counter) window.loading_counter += 1;
    else window.loading_counter = 1;

    loadingLayer.style.display = '';
}

function loadFinished() {
    window.loading_counter -= 1;
    if (window.loading_counter > 0) return;

    loadingLayer.style.display = 'none';
}