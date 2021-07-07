'use strict';
const genTr = (elements) => {
    const tr = document.createElement('tr');
    elements.forEach(element => {
        tr.append(element)
    })
    return tr;
}

const genSpan = (textContent) => {
    const span = document.createElement('span');
    span.textContent = textContent;
    return span;
}

const genButton = (textContent, click_cb) => {
    const button = document.createElement('button');
    button.textContent = textContent;
    button.addEventListener('click', click_cb)
    return button;
}

const genTd = (text_content_or_element) => {
    const el = document.createElement('td');
    if (typeof text_content_or_element === 'string') {
        el.textContent = text_content_or_element;
    } else {
        el.appendChild(text_content_or_element)
    }
    return el;
}

const genTh = (elements) => {
    const el = document.createElement('th');
    if (typeof text_content_or_element === 'string') {
        el.textContent = text_content_or_element;
    } else {
        el.appendChild(text_content_or_element)
    }
    return el;
}

const query_and_draw_table = (api, query_json, table_el) => {
    return fetch(api, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query_json)
        })
        .then(res => res.json())
        .then(query_response => {
            table_el.innerHTML = ''
            table_el.appendChild(genTr([
                genTd(""),
                genTd(genButton("商家", () => {
                    console.warn("商家")
                })),
                genTd(genButton("金额", () => {
                    console.warn("金额")
                })),
                genTd(genButton("交易时间", () => {
                    console.warn("交易时间")
                })),
            ]));
            query_response.forEach(element => {
                // TODO string safe
                table_el.appendChild(
                    genTr([
                        genTd(genButton("Ignore", () => {
                            fetch("/api/ignore_no", {
                                    method: "POST",
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        no: element[0]
                                    })
                                })
                                .then(res => res.json())
                                .then((r) => {
                                    if (r.status == 200) {
                                        refresh_page();
                                        query_and_draw_table(api, query_json, table_el)
                                    }
                                })
                        })),
                        genTd(`${element[7]}`),
                        genTd(`${element[9]}`),
                        genTd(`${element[2].substr(5)}`),
                        genTd(element[11] !== '交易成功' ? `${element[11]}` : ''),
                        genTd(Number(element[13]) !== 0 ? `${element[13]}` : '')
                    ])
                )
            });
        })
}


const getInfo = function ({
    api_all,
    api_query,
    echarts_div,
    echarts_title,
    query_table
}) {
    return fetch(api_all)
        .then(res => res.json())
        .then((data) => {
            // 基于准备好的dom，初始化echarts实例
            const myChart = echarts.init(echarts_div);
            // 使用刚指定的配置项和数据显示图表。
            myChart.setOption({

                title: {
                    text: echarts_title
                },
                tooltip: {},
                legend: {
                    data: ['出账']
                },
                xAxis: {
                    data: Object.keys(data)
                },
                yAxis: {},
                series: [{
                    name: '出账',
                    type: 'bar',
                    data: Object.values(data).map(item => item.out_cnt / 100)
                }]
            });

            myChart.on('click', ({
                dataIndex
            }) => {
                query_and_draw_table(api_query, {
                    key: Object.keys(data)[dataIndex]
                }, query_table)
            })
        });

}


const getMonth = () => {
    document.getElementById("month_table").innerHTML = ''
    return getInfo({
        api_all: "/api/month",
        api_query: "/api/month_query",
        echarts_div: document.getElementById('month_div'),
        echarts_title: "月出账",
        query_table: document.getElementById("month_table")
    })
};

const getWeek = () => {
    document.getElementById("week_table").innerHTML = ''
    return getInfo({
        api_all: "/api/week",
        api_query: "/api/week_query",
        echarts_div: document.getElementById('week_div'),
        echarts_title: "周出账",
        query_table: document.getElementById("week_table")
    })
};

const clear_page = () => {}

const refresh_page = () => {
    clear_page();
    getMonth();
    getWeek();
}

const main = () => {
    refresh_page();
}

main()