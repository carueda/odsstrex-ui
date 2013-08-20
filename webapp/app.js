$(document).ready(function() {

    refresh_sched_info({
        from: "2013-03-03 00:00",
        to:   "2013-03-27 00:00",
    });
});

function refresh_sched_info(req) {
    console.log("refresh_sched_info: " + JSON.stringify(req));
    $.ajax({
        dataType: "json",
        url: "scheduler",
        //url: "http://localhost:8080/scheduler",
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

    scheduler.locale.labels.timeline_tab = "Timeline";
    scheduler.locale.labels.section_custom = "Asset";
    scheduler.config.details_on_create = true;
    scheduler.config.details_on_dblclick = true;
    scheduler.config.xml_date = "%Y-%m-%d %H:%i";

    scheduler.xy.bar_height = 20;

//    scheduler.templates.event_bar_text = function(start,end,event) {
//        // sets text in the middle of an event bar;
//        var text = event.text.substr(0,20);
//        return "<span title='"+event.text+"'>"+text+"</span>";
//    }

    scheduler.createTimelineView({
        section_autoheight: false,
        dy: 25,
        round_position: true, //'stretches' the events upon the entire cell width, no matter how long the event lasts
        name:	"timeline",
        x_unit:	"day",
        x_date:	"%d",
        x_step:	1,
        x_size: 40,
        x_start: 0,
        x_length:	48,
        y_unit:	sections,
        y_property:	"section_id",
        render: "bar"
    });

    scheduler.config.wide_form = true;
    scheduler.config.event_duration = 60;
    scheduler.config.full_day  = true;

    scheduler.locale.labels.section_greeting = '';

    scheduler.config.lightbox.sections = [
        {name:"custom", height:23, type:"select", options:sections, map_to:"section_id" },
        {name:"description", height:60, map_to:"text", type:"textarea" , focus:true},
        {name:"time", height:72, type:"time", map_to:"auto", time_format:["%m","%d", "%Y", "%H:%i"]},

        { name: "greeting", height: 40, map_to: "my_template", type: "template" }
    ];

    // highlight the from-to period:
    var date_from = new Date(req.from);
    var date_to   = new Date(req.to  );
    scheduler.templates.timeline_cell_class = function(evs, date, section) {
        return ( date_from <= date && date <= date_to) ? "period_cell" : "";
    };

//    scheduler.templates.timeline_scalex_class = function(date){
//        if (date.getDay()==0 || date.getDay()==6)  return "yellow_cell";
//        return "";
//    }

    var control_date = new Date(2013, 2, 12);

    scheduler.templates.event_class = function(start, end, event) {

        if(start<control_date) // event start before control date
            return "past_event";

//        if(event.subject) // if event has subject property then special class should be assigned
//            return "event_"+event.subject;
//
        return "period_cell";
    };


    scheduler.attachEvent("onEventCreated", function(id, native_event) {
        var ev = scheduler.getEvent(id);
        ev.my_template = "<div>"
            + "early start: <input type='text'>  late start: <input type='text'> <br />"
            + "early end:   <input type='text'>  late end: <input type='text'>"
            + "</div>"
            ;
    });

    scheduler.attachEvent("onBeforeDrag", function(event_id, mode, native_event_object) {
       console.log("onBeforeDrag: event_id=" + event_id + " mode=" + mode);
       return true;
    });

    scheduler.attachEvent("onBeforeEventChanged", function(event_object, native_event, is_new, unmodified_event) {
        console.log("onBeforeEventChanged: event_object=" + JSON.stringify(event_object)
                    + " native_event=" + native_event
                    + " is_new=" + is_new
                    + " unmodified_event=" + JSON.stringify(unmodified_event));
        return true;
    });

    scheduler.attachEvent("onEventChanged", function(event_id, event_object) {
        console.log("onEventChanged: event_id=" + event_id);
    });

    scheduler.attachEvent("onContextMenu", function (event_id, native_event_object){
        console.log("onContextMenu: event_id=" + event_id);
    });

    scheduler.attachEvent("onEventCollision", function (ev, evs){
        console.log("onEventCollision: ev="  + JSON.stringify(ev));
        console.log("onEventCollision: evs=" + JSON.stringify(evs));
        return true;  // true to avoid the collision
    });

    scheduler.init('scheduler_here', new Date(2013, 2, 1), "timeline");

    scheduler.parse(events, "json");
}

