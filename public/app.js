/*
```
event: encounters:yes
data: {"minute":3,"hour":4,"day":15,"last_ten_minutes":[3,1,0,0,4,0,0,0,0,1]}
```
*/

(function() {

    'use strict';

    var charts = [];

    var UI = {
        connectionStatus: document.getElementById('connection-status'),
        graphs: {
            encountersYesVotes: document.getElementById('yes-votes'),
            encountersNoVotes: document.getElementById('no-votes'),
            encountersMaybeVotes: document.getElementById('maybe-votes')
        }
    };

    var source = new EventSource('/stream');

    source.onopen = function () {
        updateConnectionStatus(true);
    };

    source.onerror = function () {
        updateConnectionStatus(false);
    };

    source.addEventListener('encounters:yes', updateEncountersYes, false);
    source.addEventListener('encounters:no', updateEncountersNo, false);
    source.addEventListener('encounters:maybe', updateEncountersMaybe, false);

    source.onmessage = function (e) {
        // handle anonymous events
    };

    function updateConnectionStatus(connected) {
        UI.connectionStatus.innerText = connected ? "Connected" : "Disconnected";
        UI.connectionStatus.parentElement.className = 'panel panel--status' + (connected ? ' panel--connected' : '')
    }

    function updateEncountersYes(e) {
        updateStats(UI.graphs.encountersYesVotes, JSON.parse(e.data));
    }

    function updateEncountersNo(e) {
        updateStats(UI.graphs.encountersNoVotes, JSON.parse(e.data));
    }

    function updateEncountersMaybe(e) {
        updateStats(UI.graphs.encountersMaybeVotes, JSON.parse(e.data));
    }

    function updateStats(elem, data) {
        var lastMin = elem.querySelector('.stat--last-minute .stat__value'),
            lastHour = elem.querySelector('.stat--last-hour .stat__value'),
            lastDay = elem.querySelector('.stat--last-day .stat__value'),
            graph = elem.querySelector('.panel__chart');

        if (data) {
            lastMin.innerText = data.minute;
            lastHour.innerText = data.hour;
            lastDay.innerText = data.day;
            graph.currentData = data.last_ten_minutes;
        }

        if (!graph.currentData) {
            graph.currentData = [0,0,0,0,0,0,0,0,0,0]
        }
        var graphData = graph.currentData.map(function (i, index) {
            return ['+' + (index+1), i];
        });

        var data = google.visualization.arrayToDataTable(graphData, true);
        var view = new google.visualization.DataView(data);

        if (!elem.chart) {
            elem.chart = new google.charts.Bar(graph);
            charts.push(elem.chart);
        }

        elem.chart.draw(view, {
            width: elem.offsetWidth-70,
            height: 200,
            bar: {groupWidth: "95%"},
            legend: { position: "none" },
        });
    }
    function refresh() {
        updateStats(UI.graphs.encountersYesVotes)
        updateStats(UI.graphs.encountersNoVotes)
        updateStats(UI.graphs.encountersMaybeVotes)
    }
    google.load("visualization", "1", {packages:["bar","table"]});

    google.setOnLoadCallback(refresh);

    window.onresize = refresh



    //updateStats(UI.graphs.encountersYesVotes)
}());
