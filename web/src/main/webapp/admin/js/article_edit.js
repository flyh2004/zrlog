$(function () {
    $("#content").val(article['content']);

    $(".select2_single").select2({
        minimumResultsForSearch: -1,
        allowClear: true,
        dropdownParent: $("#type-select-parent")
    });

    var keywordsEl = $("#keywords");
    var isPrivateCheckBoxEl = $("input[name='_private']");
    keywordsEl.tagsInput({
        height: '68px',
        width: 'auto'
    });
    keywordsEl.importTags($("#keywordsVal").val());
    refreshKeywords();

    function zeroPad(num, places) {
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join("0") + num;
    }

    function checkPreviewLink() {
        if ($("#id").val() === null || $("#id").val() === '') {
            $("#preview").attr("disable", "disable");
        } else {
            updatePreviewLink($("#id").val());
        }
    }

    checkPreviewLink();

    function updatePreviewLink(id) {
        $("#preview-link").attr("href", "admin/article/preview?id=" + id);
        $("#preview").removeClass("btn-");
        $("#preview-link").show();
    }

    function tips(data) {
        if (data.error === 0) {
            $("#id").val(data.id);
            $("#alias").val(data.alias);
            $("#digest").val(data.digest);
            if (data.thumbnail !== null) {
                fillThumbnail(data.thumbnail);
            }
            updatePreviewLink(data.id);
            if (window.location.href.indexOf('?') === -1) {
                window.history.replaceState({}, "", window.location.pathname + "?id=" + data.id + window.location.hash);
            }
        }
        notify(data);
    }

    var saving = false;
    var lastChangeRequestBody;

    function validator(el) {
        //仅在2个输入框都不为空的情况，标记为又文本需要输入
        if ($("#title").val() === '' && $("#content").val() === '') {
            $("#title-parent").removeClass("has-error");
            editorEl.removeClass("has-error");
            return false;
        }
        if ($("#title").val() === '') {
            $("#title-parent").addClass("has-error");
        }
        if ($("#content").val() === '') {
            editorEl.addClass("has-error");
            editorEl.css("border-color", "#a94442");
        }
        if ($("input[name='typeId']:checked").val() === undefined) {
            $("#type-select-parent").addClass("has-error");
            $("#type-select-parent").css("border-color", "#a94442");
        } else {
            $("#type-select-parent").removeClass("has-error");
            $("#type-select-parent").css("border-color", "");
        }
        return el.find(".has-error").length === 0;
    }

    $("#title").on("change keyup paste click", function () {
        if ($(this).val() !== '') {
            $("#title-parent").removeClass("has-error");
        } else {
            if ($("#content").val() === '') {
                editorEl.removeClass("has-error");
                $("#title-parent").removeClass("has-error");
                editorEl.css("border-color", "");
            } else {
                $("#title-parent").addClass("has-error");
            }
        }
    });

    window.saveArticle = function (rubbish, timer) {
        //如果是还在保存文章状态，跳过保存
        if (saving) {
            notify({"message": lang.saving}, "warn");
            return;
        }
        refreshKeywords();
        var body = getFormRequestBody("#article-form");
        var tLastChangeRequestBody = JSON.stringify(body);
        var changed = tLastChangeRequestBody !== lastChangeRequestBody;
        if (validator($("#article-form")) && (!timer || changed)) {
            body['rubbish'] = rubbish;
            var url;
            if ($("#id").val() !== '') {
                url = "api/admin/article/update";
            } else {
                url = "api/admin/article/create";
            }
            saving = true;
            if (!skipFirstRubbishSave) {
                $.ajax({
                        url: url,
                        data: JSON.stringify(body),
                        method: "POST",
                        dataType: "json",
                        contentType: "application/json",
                        success: function (data) {
                            var date = new Date();
                            if (!data.error) {
                                data.message = (timer ? lang.auto : "") + (rubbish ? lang.rubbish : "") + (currentLang === 'en' ? " " : "") + (isPrivateCheckBoxEl.is(":checked") || timer || rubbish ? lang.saveSuccess : lang.releaseSuccess) + " " + zeroPad(date.getHours(), 2) + ":" + zeroPad(date.getMinutes(), 2) + ":" + zeroPad(date.getSeconds(), 2);
                            }
                            preTips(data);
                            lastChangeRequestBody = JSON.stringify(getFormRequestBody("#article-form"));
                        },
                        error: function (xhr, err) {
                            preTips({"error": 1, "message": formatErrorMessage(xhr, err)});
                        },
                        always: function (xhr, err) {
                            preTips({"error": 1, "message": formatErrorMessage(xhr, err)});
                        }
                    }
                )
            } else {
                skipFirstRubbishSave = false;
                saving = false;
                lastChangeRequestBody = JSON.stringify(getFormRequestBody("#article-form"));
            }
        } else {
            lastChangeRequestBody = JSON.stringify(getFormRequestBody("#article-form"));
        }
    }

    function preTips(message) {
        if (saving) {
            saving = false;
            tips(message);
        }
    }

    $(document.body).on('click', '#unCheckedTag .tag2', function (e) {
        $("#keywords_tagsinput").find('span[val=' + $(this).text() + ']').remove();
        keywordsEl.importTags($(this).text());
        $(this).remove();
        e.preventDefault();
        refreshKeywords();
    });
    $(document.body).on('click', "#keywords_tagsinput .tag2 a", function () {
        var text = $(this).siblings().text().trim();
        $("#unCheckedTag").find('span[val=' + text + ']').remove();
        $(this).parent().remove();
        $("#unCheckedTag").append('<span class="tag2" val="' + text + '"><i style="padding-right: 5px" class="fa fa-tag"></i>' + text + '</span>');
        refreshKeywords();
        return false;
    });

    function refreshKeywords() {
        var ts = $("#keywords_tagsinput .tag2").children("span");
        var tagArr = [];
        for (var i = 0; i < ts.length; i++) {
            tagArr[i] = $(ts[i]).text().trim();
        }
        if (tagArr.length > 0) {
            $("#keywordsVal").val(tagArr.join(","));
        } else {
            $("#keywordsVal").val("");
        }
    }

    $("#saveToRubbish").click(function () {
        skipFirstRubbishSave = false;
        saveArticle(true, false)
    });

    $("#save").click(function () {
        skipFirstRubbishSave = false;
        saveArticle(false, false);
    });

    $('#thumbnail-upload').liteUploader({
        script: 'api/admin/upload/thumbnail?dir=thumbnail'
    }).on('lu:success', function (e, response) {
        if (response.error) {
            alert(response.message);
        } else {
            fillThumbnail(response.url);
        }
    });

    function fillThumbnail(url) {
        $("#thumbnail-img").css('background-image', "url('" + url + "')").css("background-size", "cover");
        var w = gup("w", url);
        var h = gup("h", url);
        if (h) {
            h = 211.0 / w * h;
            $("#thumbnail-img").height(h);
            $("#thumbnail").val(url);
            $("#camera-icon").hide();
        }
    }

    var thumbnailImg = $("input[name=\"thumbnail\"]").val();
    if (thumbnailImg !== "") {
        fillThumbnail(thumbnailImg);
    }

    $("body").keydown(function (e) {
        if (e.ctrlKey && e.which === 13 || e.which === 10) {
            saveArticle(false, false);
        } else {
            if (!(String.fromCharCode(event.which).toLowerCase() === 's' && event.ctrlKey) && !(event.which === 19)) {
                return true
            }
            event.preventDefault();
            saveArticle(true, false);
            return false;
        }
    });

    function saveBtnText(_private) {
        if (_private) {
            $("#save_text").text(_res['save']);
        } else {
            $("#save_text").text(_res['release']);
        }
    }

    saveBtnText(isPrivateCheckBoxEl.is(':checked'));

    $(isPrivateCheckBoxEl).click(function () {
        saveBtnText($(this).is(':checked'));
    });

});

function gup(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results === null ? null : results[1];
}