(function () {
    var root = this;

    var DATA_URL = "https://raw.githubusercontent.com/ireapps/nicar-2020-schedule/master/nicar-2020-schedule.json";
    var TZ = "America/Chicago";

    var TZ_OFFSET = (function () {
        var d = new Date();
        var d_gmt = new Date(d.toLocaleString("en-US", {
            timeZone: "GMT"
        }));
        var d_local = new Date(d.toLocaleString("en-US", {
            timeZone: TZ
        }));
        return d_local - d_gmt;
    })();

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

    var tmp_el = document.getElementById("session-template");
    var tmpl = _.template(tmp_el.innerHTML);

    var confTime2DateObj = function (datetime) {
        var wo_tz = new Date(datetime);
        var dt = new Date(wo_tz.getTime() - TZ_OFFSET);
        return dt;
    };

    var buildSession = function (session) {
        var el = createElement("div");
        el.innerHTML = tmpl(session);
        var session_el = el.children[0];
        var dt = confTime2DateObj(session["start_datetime"]).toISOString();
        session_el.setAttribute("data-dt", dt);
        session_el.setAttribute("data-date", session["start_datetime"]);
        return session_el;
    };

    var DATES = {
        "2020-03-04": "Weds., March 4",
        "2020-03-05": "Thurs., March 5",
        "2020-03-06": "Fri., March 6",
        "2020-03-07": "Sat., March 7",
        "2020-03-08": "Sun., March 8",
    };

    var SHORT_DATES = {
        "2020-03-04": "Wednesday",
        "2020-03-05": "Thursday",
        "2020-03-06": "Friday",
        "2020-03-07": "Saturday",
        "2020-03-08": "Sunday",
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
            var times = _.groupBy(days[date], "start_datetime");
            var option = createElement("option");
            option.value = date;
            option.innerHTML = SHORT_DATES[date] + ", all sessions";
            optgroup.appendChild(option);
            _.keys(times).forEach(function (time) {
                var option = createElement("option", "specific-time-slot");
                option.value = confTime2DateObj(time).toISOString();
                option.innerHTML = SHORT_DATES[date] + " @ " + time.slice(11);
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }); 
        return select; 
    };

    var prepareData = function (data) {
        data.forEach(function (session) {
            var n_timings = session["start_end"].length;
            session["start_datetime"] = session["start_end"][0]["start_datetime"];
            session["end_datetime"] = session["start_end"][n_timings - 1]["end_datetime"];
            session["date"] = session["start_datetime"].slice(0, 10);
            session["sort_key"] = [
                session["date"],
                session["start_datetime"],
                session["end_datetime"],
                session["session_title"],
            ].join("|"); 
            session["speakers"] = session["speakers"].map(function (x) { return x.name; }).join(", ");
            session["full_date"] = DATES[session["date"]];
            session["session_description"] = (session["session_description"] || "").replace(/\n/g, "<br/>") || "[No description yet.]";
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
                var dt;
                if (is_full_day) {
                    dt = s.getAttribute("data-date-and-time").slice(0, 10);
                } else {
                    dt = s.getAttribute("data-dt");
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

    var t = getNearest15(new Date()).toISOString();
    var data_url = DATA_URL + "?t=" + t;

    getJSON(data_url, function (data) {
        var filtered = (
            data
            .filter(function (s) {
                return s["pre_registration"] == false;
            })
        );
        prepareData(filtered)
        initApp(filtered);
    });
}).call(this);
