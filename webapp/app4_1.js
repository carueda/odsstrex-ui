$(document).ready(function() {

    var tt = {};
    tt.startDate = undefined;
    tt.endDate = undefined;

    var timelineWidget;


    editFormPrepare();

    createTimelineWidget();


    refresh();

    $("#refresh").click(function() {
        refresh();
    });

    function createTimelineWidget() {
        var container = document.getElementById("timelines");
        timelineWidget = new TimelineWidget(container);
    }

    function refresh() {
        refreshTimelines({ /*pending req*/ });
    }

    function refreshTimelines(req) {
        console.log("refreshTimelines");
        pprogress("refreshing timelines ...");
        $.ajax({
            dataType: "json",
            url: "timelines",
            data: req,

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
            dataType: "json",
            url: "timeline/" + timelineName,
            data: {},

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
        console.log("got tokens for " + timelineName + " = " + JSON.stringify(tokens));

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            timelineWidget.addToken(token);
        }

        timelineWidget.redraw();
    }

    function drawTimelineWidget() {
        timelineWidget.draw();
    }


    /**
     * TODO make it more intelligent
     */
    function setVisibleChartRange() {
        if (tt.startDate == undefined) {
            var now = new Date().valueOf();
            tt.startDate = new Date(now -  4*24*60*60*1000);
            tt.endDate   = new Date(now + 20*24*60*60*1000);
            timelineWidget.setVisibleChartRange(tt.startDate, tt.endDate);
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
            url: "remove_pending",
            data: {},
            dataType: "text",
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
            url: "remove_draft",
            data: {},
            dataType: "text",
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
            url: "remove_all",
            data: {},
            dataType: "text",
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
    });

    function isNew(tokenInfo) {
        var isNew = tokenInfo.status !== undefined &&
                    tokenInfo.status.toString().indexOf("status_new") >= 0;
        return isNew;
    }

    function isPendingModified(tokenInfo) {
        return tokenInfo.status === "status_pending_modified";
    }

    function sectionLabelToKey(label) {
        return label;
//        for (var s = 0; s < sections.length; s++) {
//            var section = sections[s];
//            if (section.label === label) {
//                return section.key;
//            }
//        }
//        return -1;
    }

    function saveDraftGoal(tokenInfo, index) {
        var item = {
            early_start: unparseDate(tokenInfo.early_start),
            late_start:  unparseDate(tokenInfo.late_start),
            early_end:   unparseDate(tokenInfo.early_end),
            late_end:    unparseDate(tokenInfo.late_end),
            text:        tokenInfo.content,
            section:     sectionLabelToKey(tokenInfo.group),
            tid:         tokenInfo.tid
        };
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
            early_start: unparseDate(tokenInfo.early_start),
            late_start:  unparseDate(tokenInfo.late_start),
            early_end:   unparseDate(tokenInfo.early_end),
            late_end:    unparseDate(tokenInfo.late_end),
            text:        tokenInfo.content,
            section:     sectionLabelToKey(tokenInfo.group),
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
