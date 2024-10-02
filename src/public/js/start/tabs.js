$(document).ready(function(){
    $(".tab-item").click(function(){
        var tab_id = $(this).attr("data-tab");

        $(".tab-item").removeClass("is-active");
        $(".tab-panel").removeClass("is-active");

        $(this).addClass("is-active");
        $("#" + tab_id).addClass("is-active");
    });
});
