(function () {
    var root = this;

    var DATA_URL = "https://raw.githubusercontent.com/jsvine/nicar-2017-schedule/master/schedule/nicar-2017-schedule.json"; 

    var getJSON = function (url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function (e) {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              callback(JSON.parse(xhr.responseText));
            } else {
              console.error(xhr.statusText);
            }
          }
        };
        xhr.onerror = function (e) {
          console.error(xhr.statusText);
        };
        xhr.send(null);
    };

    var createElement = function (tag, className, html) {
        var el = document.createElement(tag);
        el.className = className || "";
        el.innerHTML = html || "";
        return el;
    };

    var ATTRIBUTES = [
        "title",
        "type",
        "description",
        "speakers",
        "date",
        "time_start",
        "time_end",
        "length_in_hours",
        "room",
        "event_id",
        "event_url"
    ];

    var tmp_el = document.getElementById("session-template");
    var tmpl = _.template(tmp_el.innerHTML);

    var timeToGmt = function (date, time, tz) {
        var offset = 1000*3600*(tz||0); // -0500
        var dt = new Date(new Date(date + "T" + time + "Z")*1 - offset);
        return dt;
    };

    var buildSession = function (session) {
        var el = createElement("div");
        el.innerHTML = tmpl(session);
        var session_el = el.children[0];
        var dt = timeToGmt(
            session["date"],
            session["time_start"],
            -5
        ).toISOString();
        session_el.setAttribute("data-dt", dt);
        session_el.setAttribute("data-date", session["date"]);
        return session_el;
    };

    var DATES = {
        "2017-03-01": "Weds., March 1",
        "2017-03-02": "Thurs., March 2",
        "2017-03-03": "Fri., March 3",
        "2017-03-04": "Sat., March 4",
        "2017-03-05": "Sun., March 5"
    };

    var SHORT_DATES = {
        "2017-03-01": "Wednesday",
        "2017-03-02": "Thursday",
        "2017-03-03": "Friday",
        "2017-03-04": "Saturday",
        "2017-03-05": "Sunday"
    };

    var SHORT_DESC_LEN = 300;

    var buildSelector = function (data) {
        var select = createElement("select");
        var default_option = createElement("option");
        default_option.selected = true;
        default_option.value = "__all__";
        default_option.innerHTML = "All sessions";
        select.appendChild(default_option);
        var days = _.groupBy(data, "date");
        _.keys(days).forEach(function (date) {
            var optgroup = createElement("optgroup");
            optgroup.label = DATES[date];
            var times = _.groupBy(days[date], "time_start");
            var option = createElement("option");
            option.value = date;
            option.innerHTML = SHORT_DATES[date] + " @ anytime";
            optgroup.appendChild(option);
            _.keys(times).forEach(function (time) {
                var option = createElement("option", "specific-time-slot");
                option.value = timeToGmt(date, time, -5).toISOString();
                option.innerHTML = SHORT_DATES[date] + " @ " + time;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }); 
        return select; 
    };

    var prepareData = function (data) {
        data.forEach(function (session) {
            session["sort_key"] = [
                session["date"],
                session["time_start"],
                session["time_end"],
                session["title"]
            ].join("|"); 
            session["full_date"] = DATES[session["date"]];
            session["description"] = session["description"].replace(/\n/g, "<br/>") || "[No description yet.]";
        });
        data.sort(function (a, b) {
            return a["sort_key"].localeCompare(b["sort_key"]);
        });
    };


    var getNearest15 = function (date) {
        var d = new Date(date);
        var m = d.getMinutes();
        d.setMinutes(m - (m % 15));
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d;
    };

    var initApp = function (data) {
        var sessions = data.map(buildSession);
        var select = buildSelector(data);

        select.onchange = function () {
            var value = this.value;
            var is_full_day = value.length === 10;
            sessions.forEach(function (s) {
                var dt = s.getAttribute("data-dt");
                if (is_full_day) {
                    dt = dt.slice(0, 10);
                }
                var match = (value === "__all__") || (dt === value);
                s.style.display = match ? "block" : "none";
            });
        };

        document.getElementById("selector").appendChild(select);

        var schedule_el = document.getElementById("schedule");
        schedule_el.innerHTML = "";
        sessions.forEach(function (s) {
            schedule_el.appendChild(s); 
        }); 

        var slots = document.querySelectorAll(".specific-time-slot");

        var snapToTime = function (dt) {
            var dt = getNearest15(dt);
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
                if (new Date(slot.value) >= dt) {
                    select.value = slot.value;
                    select.onchange.call(select);
                    break;
                }
            }
        };
        snapToTime(new Date());
        window.snapToTime = snapToTime;
    };

    getJSON(DATA_URL, function (data) {
        prepareData(data)
        initApp(data);
    });
}).call(this);