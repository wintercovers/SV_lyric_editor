function getClientInfo() {
    return {
      "name": "歌词-粘贴所选音符歌词",
      "category": "Lyrics",
      "author": "Modified from AKD",
      "versionNumber": 1,
      "minEditorVersion": 65540
    };
}

function main() {
    var selection = SV.getMainEditor().getSelection();
    var selectedNotes = selection.getSelectedNotes();
    var lyrics = SV.getHostClipboard();
    
    if (!selectedNotes.length) {
        SV.showMessageBox("错误", "请先选择要更新歌词的音符");
        SV.finish();
        return;
    }

    if (!lyrics) {
        SV.showMessageBox("错误", "剪贴板中没有歌词内容");
        SV.finish();
        return;
    }

    var lyricsArray = lyrics.split(" ");
    var j = 0;

    for (var i = 0; i < selectedNotes.length; i++) {
        var lyric = lyricsArray[j] || "la";
        if (lyric === "○" || lyric === "x" || lyric === "X") {
            lyric = "la";
        }
        selectedNotes[i].setLyrics(lyric);
        j++;
        if (j >= lyricsArray.length) {
            j = 0;
        }
    }
    
    SV.finish();
}