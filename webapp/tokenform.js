
function TokenForm() {

    var self = this;

    $(document).tooltip();

    $.datepicker.setDefaults({dateFormat: "yy-mm-dd"});

    var form         = $("#token-form"),
        predicate    = $("#predicate"),
        on_timeline  = $("#on_timeline"),

        start_min    = $("#start_min"),
        start_max    = $("#start_max"),
        start_val    = $("#start_val"),

        duration_min = $("#duration_min"),
        duration_max = $("#duration_max"),
        duration_val = $("#duration_val"),

        end_min      = $("#end_min"),
        end_max      = $("#end_max"),
        end_val      = $("#end_val"),

        follow       = $("#follow"),
        lagrangian   = $("#lagrangian"),
        path         = $("#path"),
        size         = $("#size"),

        editing      = { accept: undefined, cancel: undefined }
     ;

    start_min.datetimepicker({timeFormat: "HH:mm", numberOfMonths: 2});
    start_max.datetimepicker({timeFormat: "HH:mm"});
    start_val.datetimepicker({timeFormat: "HH:mm"});

    duration_min.timepicker();
    duration_max.timepicker();
    duration_val.timepicker();

    end_min.datetimepicker({timeFormat: "HH:mm"});
    end_max.datetimepicker({timeFormat: "HH:mm"});
    end_val.datetimepicker({timeFormat: "HH:mm"});

    predicate.change(function() {
        $("#track-section").css({visibility:
                (predicate.val() === "Track") ? "visible" : "hidden"
        });
    });


    form.dialog({
        autoOpen: false,
        //height: 300,
        width: 700,
        modal: true,
        buttons: {
            Set:    acceptForm,
            Cancel: cancelForm
        },
        close: function() {
            console.log("TokenForm close: editing=" +JSON.stringify(editing));
            if (editing.cancel !== undefined) {
                editing.cancel();
                editing.cancel = undefined;
            }

            editing.accept = undefined;
            editing.cancel = undefined;
            // allFields.val( "" ).removeClass( "ui-state-error" );
        }
    });

    function acceptForm() {
        console.log("acceptForm: editing=" +JSON.stringify(editing));
        if (editing.accept !== undefined) {
            editing.accept();
            editing.accept = undefined;
        }
        form.dialog("close");
    }

    function cancelForm() {
        console.log("cancelForm: editing=" +JSON.stringify(editing));
        if (editing.cancel !== undefined) {
            editing.cancel();
            editing.cancel = undefined;
        }
        form.dialog("close");
    }

    self.showForm = function(args) {

        console.log("TokenForm showForm: args=" + JSON.stringify(args));

        var tokenInfo  = args.tokenInfo;
        editing.accept = args.accept;
        editing.cancel = args.cancel;

        console.log("TokenForm showForm: tokenInfo=" + JSON.stringify(tokenInfo));
        console.log("TokenForm showForm: editing=" + JSON.stringify(editing));

        form.css({visibility: "visible"});

        $("#track-section").css({visibility:
                (predicate.val() === "Track") ? "visible" : "hidden"
        });

        var readOnly = "status_accepted" === tokenInfo.status;

        form.find(':input').prop("readonly", readOnly);

        predicate    .prop("disabled", readOnly);
        follow       .prop("disabled", readOnly);
        lagrangian   .attr("disabled", readOnly);
        path         .prop("disabled", readOnly);

        $('#on_timeline').prop("readonly", true); // always readonly

        start_min.datetimepicker("option", "disabled", readOnly);
        start_max.datetimepicker("option", "disabled", readOnly);
        start_val.datetimepicker("option", "disabled", readOnly);

        duration_min.timepicker("option", "disabled", readOnly);
        duration_max.timepicker("option", "disabled", readOnly);
        duration_val.timepicker("option", "disabled", readOnly);

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
    };

}
