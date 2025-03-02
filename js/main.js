// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmSession: 'bangumi_session',
};
const API = 'https://api.bgm.tv';

const WeekDay = [7, 1, 2, 3, 4, 5, 6][(new Date()).getDay()];

const weekdayRadios = document.querySelectorAll('input[name="weekday"]');

// VAR
let bgm_session = localStorage.getItem(LSKeys.bgmSession);
let dataCalender = [];

{ // INIT
    fetch(`${API}/calendar`)
        .then((e) => e.json())
        .then((e) => {
            dataCalender = e;
            randerCalender(dataCalender, WeekDay);

            weekdayRadios.forEach(ele => {
                if (WeekDay == +ele.value) {
                    ele.checked = true;
                }
                ele.addEventListener('change', () => {
                    print(1)
                    for (const ele of weekdayRadios) {
                        if (ele.checked) {
                            print(ele.value)
                            randerCalender(dataCalender, Number(ele.value));
                            break;
                        }
                    }
                })
            });
        });
}

{ // Session
    let input = document.getElementById('session_inupt');
    input.addEventListener('change', function () {
        bgm_session = this.value;
        localStorage.setItem(LSKeys.bgmSession, this.value);
    })

    // init
    if (bgm_session.length !== 0) {
        input.value = bgm_session;
    }
}

{ // Search
    let input = document.getElementById('search_input');
    let btn = document.getElementById('search_btn');

    btn.addEventListener('click', () => {
        print(input.value);
    });
}

{ // Test
    fetch(`${API}/calendar`).then((e) => e.json()).then((e) => print(e));
}

function randerCalender(arr, id) {
    if (arr.length === 0) {
        console.error('Get calendar data failed!');
        return;
    }

    for (const dayObj of arr) {
        if (dayObj['weekday']['id'] !== id) continue;
        // rander
        document.getElementById('calendar_wrapper').innerHTML = dayObj['items'].map(obj => createItem(obj)).join('');
        break;
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
}

function print(msg) {
    console.log(msg);
}