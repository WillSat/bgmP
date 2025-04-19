// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmAccessToken: 'bangumi_access_token',
    bgmUserData: 'bangumi_user_data',
    displayCollectionsTypeArr: 'display_collections_type_arr'
};
const bgmApiBaseUrl = 'https://api.bgm.tv';
const moegirlBaseUrl = 'https://mzh.moegirl.org.cn/index.php';
const CollTypeDisplayArr = [null, '想看', '看过', '在看', '搁置', '抛弃'];
const CaleDisplayArr = [null, '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

// ["grid", "small", "common", "medium", "large"];
const CalendarImageQuality = 'large';
const ListImageQuality = 'grid';
const CollectionsPreRequest = 100;
const SearchResultPreRequest = 25;

// VAR
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
    detailDesp = document.getElementById('item_detail_desp');

const loadingLayer = document.getElementById('loading_layer');
const loadingBox = document.getElementById('loading_box');

initCalendar();
randerUserData(userData);

let rawDataofSelectedItem;

function buildStructData(id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType) {
    return { id, name, nameCn, imgUrl, rank, score, playWeekDayCode, inCollType };
}

function sortStructData(a, b) {
    if (a.score && b.score) return a.score < b.score;
    else return b.score ? true : false;
}

async function initCalendar() { // Calendar
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

    // bind events
    for (const a of document.querySelectorAll('#calendar_wrapper a.image_items')) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            openDetailMenu(a.rawData);
        })
    }

    function createImageItems(structData) {
        let eleTitle = `${structData.nameCn ? structData.nameCn + '\n' : ''}${structData.name}\nID: ${structData.id}`
        eleTitle += structData.rank ? `\n排名：${structData.rank}` : '';
        eleTitle += structData.score ? `\n评分：${structData.score}` : '';

        const aEle = document.createElement('a');
        aEle.classList.add('image_items');
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
            rankEle.textContent = `#${structData.rank}`;
            aEle.appendChild(rankEle);
        }

        if (structData.score) {
            const scoreEle = document.createElement('div');
            scoreEle.classList.add('score');
            scoreEle.textContent = structData.score;
            aEle.appendChild(scoreEle);
        }
        return aEle;
    }
}

// Collections
async function initCollections(isRefresh) {
    if (window.location.hash === '') {
        // log out
        console.info('Log out.');
        collectionsWrapperEle.innerHTML = '';
        return;
    }
    if (!userData || isRefresh) {
        console.warn('Broken Access Token.');
        collectionsWrapperEle.innerHTML = '';
        if (await refreshUserData() ? false : true) return;
    }
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
}

function randerCollections(typeArr) {
    collectionsWrapperEle.innerHTML = '';

    // rander
    for (const type of typeArr) {
        const tempArr = collectionsDataList.filter(e => e.inCollType === type).toSorted(sortStructData).map(obj => createListItems(obj));
        randerGroup(
            `${CollTypeDisplayArr[type]} · ${tempArr.length}`,
            tempArr,
            collectionsWrapperEle
        );
    }

    // bind events
    for (const a of document.querySelectorAll('#collections_wrapper a.list_item')) {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            openDetailMenu(a.rawData);
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
    // aEle.href = 'javascript:void(0);';
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

    if (structData.rank || structData.score) {
        const tailEle = document.createElement('div');
        tailEle.classList.add('tail');

        if (structData.rank) {
            const rankEle = document.createElement('div');
            rankEle.classList.add('rank');
            rankEle.textContent = `#${structData.rank}`;
            tailEle.appendChild(rankEle);
        }

        if (structData.score) {
            const scoreEle = document.createElement('div');
            scoreEle.classList.add('score');
            scoreEle.textContent = structData.score;
            tailEle.appendChild(scoreEle);
        }

        aEle.appendChild(tailEle);
    }

    return aEle;
}

function openDetailMenu(rawData) {
    if (window.mune_opening) return;
    window.mune_opening = true;

    if (window.clear_menu_timer) clearTimeout(window.clear_menu_timer);

    // 
    // rander start
    // 

    // search collection, rander status
    const itemInCollIndex = collectionsDataList.findIndex(e => e.id === rawData.id);
    inCollStatus = itemInCollIndex > -1 ? CollTypeDisplayArr[collectionsDataList[itemInCollIndex].inCollType] : '未收藏';

    // search collection, rander status
    const itemInCaleIndex = calenderDataList.findIndex(e => e.id === rawData.id);
    inCaleStatus = itemInCaleIndex > -1 ? '放送中 · ' + CaleDisplayArr[calenderDataList[itemInCaleIndex].playWeekDayCode] : '未在放送';

    detailTitle.textContent = `${inCollStatus} · ${rawData.name}`;
    detailCover.src = detailBlurBg.src = rawData.imgUrl;
    detailCover.alt = detailBlurBg.alt = rawData.id;
    detailCnname.textContent = rawData.nameCn;
    detailName.textContent = rawData.name;

    // loading
    detailDesp.innerHTML = wordBlock('正在从 Bangumi 请求数据...');

    // selected item to globel
    rawDataofSelectedItem = rawData;
    detailLayer.classList.add('open');

    (async () => {
        // fetch detail
        const detailData = await (await request(`/v0/subjects/${rawData.id}`, 'GET', false, null)).json();
        const detailObj = getItemDetail(detailData);

        const summary = (detailObj.summary && detailObj.summary !== '') ? detailObj.summary.trim() : false;
        // remove duplicates
        const metaTags = [...(new Set(detailObj.metaTags))].map(e => wordBlock(e, 'META', null, 'tag'));
        const tags = (detailObj.tags ?? []).filter(e => e.count > 1).map(e => wordBlock(e.name, e.count, null, 'tag'));
        // K-V
        const infoBox = (detailObj.infobox ?? []).map(e => {
            if (typeof e.value === 'string') {
                // "*"
                if (e.value === '*') return wordBlock('(待完善或省略)', null, e.key, 'info');
                if (e.key === '官方网站') return wordBlock(`<a href="${e.value}">${e.value}</a>`, null, e.key, 'info');
                else return wordBlock(e.value, null, e.key, 'info');
            } else if (e.key === '别名' && Array.isArray(e.value)) {
                const aliasTempArr = e.value.map(obj => obj['v']);
                if (aliasTempArr.length === 1) {
                    return wordBlock(aliasTempArr.join('<br>'), null, e.key, 'info');
                } else {
                    return wordBlock('<br>' + aliasTempArr.join('<br>'), null, e.key, 'info');
                }
            }
        });

        detailDesp.innerHTML = [
            rawData.rank ? wordBlock(rawData.rank, null, '排名') : '',
            rawData.score ? wordBlock(rawData.score, null, '评分') : '',
            detailObj.date ? wordBlock(detailObj.date, null, '放送开始') : '',
            detailObj.totalEpisodes ? wordBlock(detailObj.totalEpisodes, null, '话数') : '',
            detailObj.platform ? wordBlock(detailObj.platform, null, '平台') : '',
            wordBlock(rawData.id, null, 'ID'),
            '<br>',
            wordBlock('', null, inCollStatus),
            itemInCaleIndex > -1 ? wordBlock('', null, inCaleStatus) : wordBlock(inCaleStatus),
            '<br>',
            metaTags.join(''),
            metaTags.length !== 0 ? '<br>' : '',
            tags.join(''),
            tags.length !== 0 ? '<br>' : '',
            summary ? wordBlock('<br>' + summary, null, '简介') : '',
            summary ? '<br>' : '',
            infoBox.join('<br>'),
        ].join('');

        // 
        // rander over
        // 
        window.mune_opening = false;

    })();

    function wordBlock(content, tail, head, className) {
        return `<div class="word_block ${className ?? ''}">${head ? `<span class="word_block_head">${head}</span> ` : ''}${content}${tail ? `<sup class="word_block_tail">${tail}</sup>` : ''}</div>`;
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
}

function closeDetailMenu() {
    detailLayer.classList.remove('open');

    // clean up
    window.clear_menu_timer = setTimeout(() => {
        detailCover.src = detailBlurBg.src = '';
        detailCover.alt = detailBlurBg.alt = '';
        detailTitle.textContent = '';
        detailCnname.textContent = '';
        detailName.textContent = '';
        detailDesp.innerHTML = '';
    }, 300);

    // prevent misoperation
    rawDataofSelectedItem = null;
}

async function request(url, method, withAuthorization, body) {
    startLoading();
    const options = { method };
    if (withAuthorization) options['headers'] = new Headers({
        'Authorization': `Bearer ${window.location.hash.substring(1)}`,
        'Content-Type': "application/json"
    });
    if (body) options['body'] = JSON.stringify(body);

    try {
        const res = await fetch(bgmApiBaseUrl + url, options);
        loadFinished();
        return res;
    } catch (error) {
        console.error('Request failed: ', error);
        loadFinished();
        return null;
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
}

async function refreshUserData(isRandering) {
    const r = await request('/v0/me', 'GET', true);

    if (r.ok) {
        const res = await r.json();
        if (res['id']) {
            userData = res;
            randerUserData(userData);
            localStorage.setItem(LSKeys.bgmUserData, JSON.stringify(userData));
            if (isRandering) initCollections();
            return true;
        }
    } else {
        console.warn('FN refreshUserData: Broken Access Token.');
        userData = null;
        localStorage.setItem(LSKeys.bgmUserData, null);
        localStorage.setItem(LSKeys.bgmAccessToken, null);
        window.location.hash = '';
    }
    randerUserData(null);
}

function randerUserData(userData) {
    const userInfoEle = document.getElementById('user_info');
    const userNameEle = document.getElementById('user_name');
    const userAvatarEle = document.getElementById('user_avatar');

    if (userData) {
        const userInfo = `昵称：${userData['username']}\n签名：${userData['sign'] === '' ? '（无）' : userData['sign']}\nID：${userData['id']}\n注册时间：${userData['reg_time']}\n邮箱：${userData['email']}\n\n更改网址 # 后内容更改登录，清空则登出`;

        userNameEle.textContent = userData['username'];
        userAvatarEle.src = userData['avatar']['large'];
        userInfoEle.title = userInfo;
    } else {
        userNameEle.textContent = '';
        userAvatarEle.src = 'img/default_avatar.svg';
        userInfoEle.title = '更改网址 # 后内容更改登录，清空则登出';
    }
}

{ // Access Token
    window.addEventListener("hashchange", () => {
        localStorage.setItem(LSKeys.bgmAccessToken, window.location.hash);

        // refresh
        collectionsDataList = [];
        initCollections(true);
    }, false);


    const cachedAT = localStorage.getItem(LSKeys.bgmAccessToken);
    console.log('cachedAT:', cachedAT, 'window.location.hash:', window.location.hash);

    if (window.location.hash !== '') {
        initCollections(cachedAT === window.location.hash ? false : true);
        localStorage.setItem(LSKeys.bgmAccessToken, window.location.hash);
    } else if (cachedAT !== null && cachedAT !== '') {
        window.location.hash = localStorage.getItem(LSKeys.bgmAccessToken);
    } else {
        window.location.hash = prompt(
            '输入您的 Bangumi Access Token，留空则不使用登录功能。您也可以手动更改 URL 的 hash 值实现登录。'
        ) ?? '';
    }
}

{
    detailLayer.addEventListener('click', closeDetailMenu);

    detailContainer.addEventListener('click', e => e.stopPropagation());

    closeMenuBtn.addEventListener('click', closeDetailMenu);

    for (const ele of document.querySelectorAll('#menu_box div.box_item')) {
        ele.addEventListener('click', async function (e) {
            e.stopPropagation();
            if (!rawDataofSelectedItem || !rawDataofSelectedItem.id) return;

            const realName = rawDataofSelectedItem.nameCn && rawDataofSelectedItem.nameCn !== ''
                ? rawDataofSelectedItem.nameCn : rawDataofSelectedItem.name;

            // 0: open in 
            if (+this.getAttribute('value') === -1) {
                window.open(`${moegirlBaseUrl}?search=${realName}`);
                closeDetailMenu();
                return;
            }

            // 0: open in bgm.tv
            if (+this.getAttribute('value') === 0) {
                window.open(`https://bgm.tv/subject/${rawDataofSelectedItem.id}`);
                closeDetailMenu();
                return;
            }

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

            closeDetailMenu();
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

        // bind events
        for (const a of document.querySelectorAll('#search_results a.list_item')) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                openDetailMenu(a.rawData);
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
        })

    });
}