$(document).ready(function() {

    var tt = {};
    tt.startDate = undefined;
    tt.endDate = undefined;

    var tokenForm = new TokenForm();
    var timelineWidget = new TimelineWidget(document.getElementById("timelines"),
                                            tokenForm);


    var tickRateSecs = undefined;
    var autoRefresh = false;

    getTickRate();
    refresh();

    $("#refresh").click(function() {
        autoRefresh = false;
        refresh();
    });

    var timerEl = $("#timer");
    var timerInterval = $("#timerInterval");
    var timer = undefined;
    timerEl.click(function() {
        if (timer === undefined) {
            var sec = timerInterval.val();
            if (sec === undefined || sec === "") {
                sec = tickRateSecs;
            }
            else if (sec < 10) {
                sec = 10;
            }
            timerInterval.val(sec);
            timer = setInterval(function() {
                        autoRefresh = true;
                        refresh();
                    },
                    1000 * sec);
            timerEl.text("stopTimer");
            pstatus("refresh timer started, interval=" +sec+ "sec");
        }
        else {
            clearInterval(timer);
            timer = undefined;
            timerEl.text("startTimer");
            pstatus("refresh timer stopped");
        }
    });

    function getTickRate() {
        console.log("getting tick rate");
        pprogress("getting tick rate");
        $.ajax({
            url:        odsstrexConfig.rest + "/tick/rate",
            dataType:   "json",
            data:       {},

            success: function(res) {
                success();
                tickRateSecs = res.nanoseconds / 1000000000;
                timerInterval.val(tickRateSecs);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }



    function refresh() {
        perror();
        console.log("refreshing...");
        pprogress("refreshing...");
        refreshTimelines({ /*pending req*/ });
    }

    /**
     * If current time is toward the end of the chart (~90%),
     * updates the range so current time appears in the middle.
     * TODO make it more intelligent
     */
    function setVisibleChartRange() {
        if (!autoRefresh) {
            return;
        }
        var vis = timelineWidget.getVisibleChartRange();
        var start = parseDate(vis.start).valueOf();
        var end   = parseDate(vis.end).valueOf();
        var len   = end - start;
        var limit = Math.round(start + len * 0.9);
        var now = new Date().valueOf();
        if (now > limit) {
            // make current time go to the middle of the chart
            var half = len / 2;
            start = moment(now - half);
            end   = moment(start + len);
            timelineWidget.setVisibleChartRange(start.toDate(), end.toDate());
        }
    }

    function refreshTimelines(req) {
        $.ajax({
            url:        odsstrexConfig.rest + "/timelines",
            dataType:   "json",
            data:       req,

            success: function(res) {
                success();
                gotTimelines(req, res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }


    function gotTimelines(req, res) {

        initTimelines(req, res);
        putGroups();
        putTokens();
        drawTimelineWidget();
        setVisibleChartRange();
        getNextTick();
    }

    function initTimelines(req, res) {
        tt.timelines = res;
        console.log("initTimelines = " + JSON.stringify(tt.timelines));
        timelineWidget.reinit();
    }

    function putGroups() {
        for (var s = 0; s < tt.timelines.length; s++) {
            var tml = tt.timelines[s];
            timelineWidget.addGroup(tml);
        }
    }

    function putTokens() {
        for (var s = 0; s < tt.timelines.length; s++) {
            getTokens(tt.timelines[s].name);
        }
    }

    function getTokens(timelineName) {
//        console.log("getting tokens for " + timelineName);
        pprogress("getting tokens for " + timelineName);
        $.ajax({
            url:         odsstrexConfig.rest + "/timeline/" + timelineName,
            dataType:    "json",
            data:        {},

            success: function(res) {
                success();
                gotTokens(timelineName, res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }

    function gotTokens(timelineName, tokens) {
        if (tokens.length == 0) {
            return;
        }
        console.log("got tokens for " + timelineName + ":");

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            timelineWidget.addToken(token);
        }

        timelineWidget.redraw();
    }

    function drawTimelineWidget() {
        timelineWidget.draw();
    }

    function getNextTick() {
        pprogress("getting next tick ");
        $.ajax({
            url:         odsstrexConfig.rest + "/tick/next",
            dataType:    "json",

            success: function(res) {
                success();
                gotNextTick(res);
            },

            error: function (xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    }

    function gotNextTick(res) {
        console.log("gotNextTick: " + JSON.stringify(res));

        var nextTick = parseDate(res.date);
        timelineWidget.timeline.setCustomTime(nextTick);

        var timeout = nextTick.valueOf() - new Date().valueOf();
        if (timeout > 0) {
            setTimeout(function() {
                autoRefresh = true;
                refresh()
            }, timeout);
        }
    }

    /////////////////////////////////////////////////////////////////////////


    $(document).ajaxError(function(event, request, settings) {
        perror("Error requesting page " + settings.url);
    });

    $("#save_draft_goals").click(function() {
        var tokenInfos = timelineWidget.tokenInfos;
        for (var index = 0; index < tokenInfos.length; index++) {
            var tokenInfo = tokenInfos[index];
            if (isNew(tokenInfo)) {
                console.log("tokenInfo.status = " + JSON.stringify(tokenInfo.status));
                saveDraftGoal(tokenInfo, index);
            }
        }
    });

    $("#submitGoals").click(function() {
        var tokenInfos = timelineWidget.tokenInfos;
        for (var index = 0; index < tokenInfos.length; index++) {
            var tokenInfo = tokenInfos[index];
            if (isNew(tokenInfo) || isPendingModified(tokenInfo)) {
                console.log("tokenInfo.status = " + JSON.stringify(tokenInfo.status));
                submitGoal(tokenInfo, index);
            }
        }
    });

    $("#remove_pending").click(function() {
        pprogress("removing pending...");
        $.ajax({
            url:         odsstrexConfig.rest + "/remove_pending",
            data:        {},
            dataType:    "text",
            success: function(res) {
                success();
                console.log("remove_pending response: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#remove_draft").click(function() {
        pprogress("removing drafts..");
        $.ajax({
            url:         odsstrexConfig.rest + "/remove_draft",
            data:        {},
            dataType:    "text",
            success: function(res) {
                success();
                console.log("remove_draft reponse: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#removeAll").click(function() {
        pprogress("removing all...");
        $.ajax({
            url:        odsstrexConfig.rest + "/remove_all",
            data:       {},
            dataType:   "text",
            success: function(res) {
                success();
                console.log("remove_all reponse: " + res);
                refresh();
            },

            error: function(xhr, ajaxOptions, thrownError) {
                perror("error: " + thrownError);
            }
        });
    });

    $("#redraw").click(function() {
        timelineWidget.redraw();
        timelineWidget.draw();
    });

    function isNew(tokenInfo) {
        var isNew = tokenInfo.status !== undefined &&
                    tokenInfo.status.toString().indexOf("status_new") >= 0;
        return isNew;
    }

    function isPendingModified(tokenInfo) {
        return tokenInfo.status === "status_pending_modified";
    }

    function saveDraftGoal(tokenInfo, index) {

        console.log("/draft_goals: tokenInfo=" + JSON.stringify(tokenInfo));

        var item = {
            early_start: unparseDate(tokenInfo.start.min),
            late_start:  unparseDate(tokenInfo.start.max),
            early_end:   unparseDate(tokenInfo.end.min),
            late_end:    unparseDate(tokenInfo.end.max),
            text:        tokenInfo.text,
            section:     strip(tokenInfo.section_id),
            tid:         tokenInfo.tid,

            'test' : { 'foo' : 123, 'baz': "hello"}
        };

//        var item = {
//            early_start: unparseDate(tokenInfo.early_start),
//            late_start:  unparseDate(tokenInfo.late_start),
//            early_end:   unparseDate(tokenInfo.early_end),
//            late_end:    unparseDate(tokenInfo.late_end),
//            text:        tokenInfo.content,
//            section:     strip(tokenInfo.group),
//            tid:         tokenInfo.tid
//        };
//

        console.log("/draft_goals: posting " + JSON.stringify(item));
        pprogress("saving drafts...");
        $.post("draft_goals", item, function(data) {
            success();
            console.log("/draft_goals: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            timelineWidget.updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
        }).always(function() {
            pprogress();
        });
    }


    function submitGoal(tokenInfo, index) {
        var item = {
            early_start: unparseDate(tokenInfo.start.min),
            late_start:  unparseDate(tokenInfo.start.max),
            early_end:   unparseDate(tokenInfo.end.min),
            late_end:    unparseDate(tokenInfo.end.max),
            text:        tokenInfo.text,
            section:     strip(tokenInfo.section_id),
            tid:         tokenInfo.tid
        };
        console.log("posting " + JSON.stringify(item));
        pprogress("submitting goal..");
        $.post("goal", item, function(data) {
            success();
            console.log("/goal: response " + JSON.stringify(data));
            tokenInfo.tid = data.tid;
            timelineWidget.updateStatus(index, tokenInfo, data.status);
            console.log("/draft_goals: tokenInfo " + JSON.stringify(tokenInfo));
        }).always(function() {
            pprogress();
        });
    }

});


function TokenInfo(obj) {
    var self = this;
    var defaults = {
        'status'      : "status_new",
        'early_start' : undefined,
        'late_start'  : undefined,
        'early_end'   : undefined,
        'late_end'    : undefined,
        'content'     : undefined,
        'group'       : undefined,
        'tid'         : undefined
    };
    jQuery.extend(self, defaults, obj);
}
