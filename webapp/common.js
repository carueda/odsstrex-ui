function pushBlocks(tokenInfo, index, data) {

    // note: blocks always editable even for accepted tokens because the
    // widget restricts too much if we indicate editable=false.

    var start = {
        'start':      tokenInfo.early_start,
        'end':        tokenInfo.late_start,
        'content':    "", //"start",
        'group':      tokenInfo.group,
        'className':  tokenInfo.status + " " + "block-start",
        'tokenInfo':  {'kind': 'start', 'index': index}
    };

    var body = {
        'start':      tokenInfo.late_start,
        'end':        tokenInfo.early_end,
        'content':    tokenInfo.content,
        'group':      tokenInfo.group,
        'className':  tokenInfo.status + " " + "block-body",
        'tokenInfo':  {'kind': 'body', 'index': index}
    };

    var end = {
        'start':      tokenInfo.early_end,
        'end':        tokenInfo.late_end,
        'content':    "", //"end",
        'group':      tokenInfo.group,
        'className':  tokenInfo.status + " " + "block-end",
        'tokenInfo':  {'kind': 'end', 'index': index}
    };

    var background = {
        'start':      tokenInfo.early_start,
        'end':        tokenInfo.late_end,
        'content':    "",
        'group':      tokenInfo.group,
        'className':  'backgroud-block',
        'tokenInfo':  {'kind': 'background', 'index': index}
    };

    // push the 4 blocks associated to each token:
    data.push(background);
    data.push(start);
    data.push(body);
    data.push(end);
}

function strip(html) {
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent||tmp.innerText;
}


function parseDate(str) {
    var m = moment(str).local();
//    console.log("parseDate " + str+ " --> " + m.format());
    return m.toDate();
}

function unparseDate(date) {
    if (date === undefined) {
        return undefined;
    }
    var m = moment(date).utc();
    var f = m.format("YYYY-MM-DD HH:mm");
    //console.log("unparseDate " + date+ " => " + f);
    return f;
}

function prepareHover() {
//    console.log("prepareHover");
//    $(".timeline-event-range").hover(
//        function () {
//            var domEl = $(this).get(0);
//            var className = "block-selected";
//            links.Timeline.addClassName(domEl, className);
//            //$(this).addClass("block-selected");
//        },
//        function () {
//            var domEl = $(this).get(0);
//            var className = "block-selected";
//            links.Timeline.removeClassName(domEl, className);
//            //$(this).removeClass("block-selected");
//        }
//    );
}

function pstatus(msg, autohide) {
    if ( msg == undefined || msg === "") {
        $("#status").text("");
    }
    else if (autohide == undefined || autohide == true) {
        $("#status").stop(true, true).text(msg)
            .fadeIn(0).delay(2000).fadeOut(1000);
    }
    else {
        $("#status").text(msg).fadeIn(1000);
    }
}

function pprogress(msg) {
    if ( msg == undefined || msg == "") {
        $("#status").text("");
    }
    else {
        pstatus(msg, false);
    }
}

function perror(err) {
    pprogress();
    $("#error").text(err);
    if (err !== undefined && err !== "") {
        console.log(err);
    }
}

function success() {
    pprogress();
    $("#error").text("");
}


function editFormPrepare() {

    $(document).tooltip();

    $.datepicker.setDefaults({dateFormat: "yy-mm-dd"});

    var form      = $("#token-form"),
        start_min = $("#start_min"),
        start_max = $("#start_max"),
        start_val = $("#start_val"),

        end_min = $("#end_min"),
        end_max = $("#end_max"),
        end_val = $("#end_val");

    start_min.datetimepicker({timeFormat: "HH:mm", numberOfMonths: 2});
    start_max.datetimepicker({timeFormat: "HH:mm"});
    start_val.datetimepicker({timeFormat: "HH:mm"});

    end_min.datetimepicker({timeFormat: "HH:mm"});
    end_max.datetimepicker({timeFormat: "HH:mm"});
    end_val.datetimepicker({timeFormat: "HH:mm"});

    form.dialog({
        autoOpen: false,
        //height: 300,
        width: 700,
        modal: true,
        buttons: {
        "Set": function() {
            console.log("Set: TODO");
            // allFields.removeClass( "ui-state-error" );
        },
        Cancel: function() {
            $(this).dialog("close");
        }
        },
        close: function() {
            // allFields.val( "" ).removeClass( "ui-state-error" );
        }
    });
}

function editFormShow(index, tokenInfo) {

    console.log("editFormShow: tokenInfo=" + JSON.stringify(tokenInfo));

    var form        = $("#token-form"),
        predicate   = $("#predicate"),
        on_timeline = $("#on_timeline"),

        start_min = $("#start_min"),
        start_max = $("#start_max"),
        start_val = $("#start_val"),

        duration_min = $("#duration_min"),
        duration_max = $("#duration_max"),
        duration_val = $("#duration_val"),

        end_min = $("#end_min"),
        end_max = $("#end_max"),
        end_val = $("#end_val");

    var readOnly = "status_accepted" === tokenInfo.status;
    form.find(':input').prop("readonly", readOnly);

    $('#on_timeline').prop("readonly", true); // always readonly

    start_min.datetimepicker("option", "disabled", readOnly);
    start_max .datetimepicker("option", "disabled", readOnly);
    start_val.datetimepicker("option", "disabled", readOnly);

    duration_min.timepicker();
    duration_max.timepicker();
    duration_val.timepicker();

    end_min.datetimepicker("option", "disabled", readOnly);
    end_max.datetimepicker("option", "disabled", readOnly);
    end_val.datetimepicker("option", "disabled", readOnly);

    predicate  .val(tokenInfo.content);
    on_timeline.val(strip(tokenInfo.section_id));

    start_min.val(unparseDate(tokenInfo.start.min));
    start_max.val(unparseDate(tokenInfo.start.max));
    start_val.val(unparseDate(tokenInfo.start.value));

    duration_min.val(tokenInfo.duration.min);
    duration_max.val(tokenInfo.duration.max);
    duration_val.val(tokenInfo.duration.value);

    end_min.val(unparseDate(tokenInfo.end.min));
    end_max.val(unparseDate(tokenInfo.end.max));
    end_val.val(unparseDate(tokenInfo.end.value));

    form.dialog("open");
}
