$(document).ready(function() {

    refresh_sched_info({
        from: "2013-03-03 00:00",
        to:   "2013-04-10 00:00",
    });
});

function refresh_sched_info(req) {
    console.log("refresh_sched_info: " + JSON.stringify(req));
    $.ajax({
        dataType: "json",
        url: "scheduler",
        data: req,

        success: function(res) {
            got_sched_info(req, res);
        },

        error: function (xhr, ajaxOptions, thrownError) {
            console.log("error: " + thrownError);
        }
    });
}

function got_sched_info(req, res) {
    console.log("retrieved scheduler res = " + JSON.stringify(res));

    var sections = res.sections;
    var events   = res.events;

//    console.log("events = " + JSON.stringify(obj.events));

    function drawTimeline(data, container, showAxisLabels) {
        // specify options
        var options = {
            'width':            '99%',
            'height':           'auto',
            'editable':         true,   // enable dragging and editing events
            'style':            'box',
            'snapEvents':       false,
            'eventMargin':      8,
            'eventMarginAxis':  8,
            //'showNavigation':   true,
            //'showButtonNew':    true,
            'showMajorLabels':  showAxisLabels,
            'showMinorLabels':  showAxisLabels,
            'axisOnTop':        true,
            'groupsChangeable': true,
            //'groupsOnRight':    true,
//            'showCustomTime':    true
        };

        // Instantiate our timeline object.
        var timeline = new links.Timeline(container);

        // Draw our timeline with the created data and options
        timeline.draw(data, options);

        function getSelectedRow() {
            var row = undefined;
            var sel = timeline.getSelection();
            if (sel.length) {
                if (sel[0].row != undefined) {
                    row = sel[0].row;
                }
            }
            return row;
        }

        function strip(html) {
            var tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent||tmp.innerText;
        }

        var onEdit = function(event) {
            console.log("onEdit: " + JSON.stringify(event));
            var row = getSelectedRow();
            console.log("row: " + row);
            var content = data[row].content;
            var availability = strip(content);
            var newAvailability = prompt("Enter status\n\n" +
                    "Choose from: Available, Unavailable, Maybe", availability);
            if (newAvailability != undefined) {
                var newContent = newAvailability;
                data[row].content = newContent;
                timeline.draw(data);
            }
        };

        links.events.addListener(timeline, 'edit', onEdit);

        var onChange = function(event) {
            console.log("onChange: " + JSON.stringify(event));

            var row = getSelectedRow();
            console.log("row: " + row + " data[row] = " + JSON.stringify(data[row]));

        };

        links.events.addListener(timeline, 'change', onChange);

        return timeline;
    };

    var data = [];
    var timeline_id = "timelines";

    var sections_dict = {}
    for (var s = 0; s < sections.length; s++) {
        var section = sections[s];
        sections_dict[section.key] = section.label;
    }
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        data.push({
            'start':   parseDate(event.start_date),
            'end':     parseDate(event.end_date),
            'content': event.text,
            'group':   sections_dict[event.section_id]
        });
    }
    var container = document.getElementById(timeline_id);
    var timeline = drawTimeline(data, container, true);
    $(window).bind('resize', function() {
        timeline.redraw();
    });

    start = parseDate(req.from);
    end = parseDate(req.to);
    timeline.setVisibleChartRange(start, end);

};


function parseDate(str) {
    // format: "2013-03-08 00:00"
    var date = new Date(
        parseInt(str.substr(0, 4), 10),      // year
        parseInt(str.substr(5, 2), 10) - 1,  // month
        parseInt(str.substr(8, 2), 10),      // day
        parseInt(str.substr(11, 2), 10),     // hour
        parseInt(str.substr(14, 2), 10)      // mm
    );
    return date;
}



