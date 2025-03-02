// WillSat/bgmP
// localStorage keys
const LSKeys = {
    bgmSession: 'bangumi_session',
};

// VAR
let bgm_session = localStorage.getItem(LSKeys.bgmSession);

{ // Session
    let input = document.getElementById('session_inupt');
    input.addEventListener('change', function () {
        print(this.value);
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
        // https://bgm.tv/subject_search/%3F%3F?cat=2
    });
}

function print(msg) {
    console.log(msg);
}