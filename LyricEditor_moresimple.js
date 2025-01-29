/**
 * 多步骤歌词编辑器(直接从默认生成词格开始）
 * 这个版本移除了编辑词格和确认粘贴歌词的步骤
 * Copyright (c) 2025 河冰 (https://space.bilibili.com/11735521) 
 * Based on work by 凋零葉 (https://space.bilibili.com/13690791)
 * Licensed under the MIT License
 */

function getClientInfo() {
  return {
    "name": "歌词编辑器(直接从默认生成词格开始）",
    "category": "Lyrics",
    "author": "河冰，基于凋零葉的词格提取器发展而来",
    "versionNumber": 1,
    "minEditorVersion": 65540
  };
}

function generatePlaceholders(selectedNotes) {
  var placeholders = "";
  var lastEnd = -1;

  for (var i = 0; i < selectedNotes.length; i++) {
    var note = selectedNotes[i];
    if (note.getOnset() > lastEnd && i > 0) {
      placeholders += "\n";
    }
    placeholders += "○";
    lastEnd = note.getOnset() + note.getDuration();
  }
  
  return placeholders;
}

function extractLyrics(selectedNotes) {
  var lyrics = "";
  var lastEnd = -1;

  for (var i = 0; i < selectedNotes.length; i++) {
    var note = selectedNotes[i];
    if (note.getOnset() > lastEnd && i > 0) {
      lyrics += "\n";
    }
    
    var noteLyric = note.getLyrics() || "○";
    if (/^[a-zA-Z+-]+$/.test(noteLyric)) {
      noteLyric = "[" + noteLyric + "]";
    }
    
    lyrics += noteLyric;
    lastEnd = note.getOnset() + note.getDuration();
  }
  
  return lyrics;
}

function formatLyricsWithPlaceholders(lyrics, placeholders) {
  var formattedLyrics = "";
  var lyricArray = [];
  
  var lyricLines = lyrics.split("\n");
  
  for (var lineIndex = 0; lineIndex < lyricLines.length; lineIndex++) {
    var line = lyricLines[lineIndex];
    var segments = line.split(/(\[.*?\]|\s+)/);
    
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (!segment) continue;
      
      if (/^[\s\u3000]+$/.test(segment)) {
        lyricArray.push(segment);
        continue;
      }
      
      if (segment.toLowerCase() === "la") {
        lyricArray.push(segment);
        continue;
      }
      
      if (/^\[.*?\]$/.test(segment)) {
        lyricArray.push(" " + segment.slice(1, -1) + " ");
        continue;
      }
      
      var chars = segment.split('');
      for (var j = 0; j < chars.length; j++) {
        if (chars[j].trim()) {
          lyricArray.push(chars[j]);
        }
      }
    }
    
    if (lineIndex < lyricLines.length - 1) {
      lyricArray.push("\n");
    }
  }

  var placeholderLines = placeholders.split("\n");
  var lyricIndex = 0;
  
  for (var i = 0; i < placeholderLines.length; i++) {
    var segments = placeholderLines[i].split(/(\s+)/);
    
    for (var s = 0; s < segments.length; s++) {
      var segment = segments[s];
      
      if (/^[\s\u3000]+$/.test(segment)) {
        formattedLyrics += segment;
        continue;
      }
      
      var placeholderMatches = segment.match(/[○xX]/g);
      if (!placeholderMatches) continue;
      
      for (var j = 0; j < placeholderMatches.length; j++) {
        while (lyricIndex < lyricArray.length && 
               (lyricArray[lyricIndex] === "\n" || /^[\s\u3000]+$/.test(lyricArray[lyricIndex]))) {
          lyricIndex++;
        }
        
        if (lyricIndex < lyricArray.length) {
          formattedLyrics += lyricArray[lyricIndex];
          lyricIndex++;
        } else {
          formattedLyrics += "la";
        }
      }
    }
    
    if (i < placeholderLines.length - 1) {
      formattedLyrics += "\n";
    }
  }

  return formattedLyrics;
}

function main() {
  var selection = SV.getMainEditor().getSelection();
  var selectedNotes = selection.getSelectedNotes();
  
  if (selectedNotes.length === 0) {
    SV.showMessageBox("错误", "请先选择要编辑歌词的音符");
    SV.finish();
    return;
  }

  var initialPlaceholders = generatePlaceholders(selectedNotes);
  var currentLyrics = extractLyrics(selectedNotes);
  var formattedLyrics = formatLyricsWithPlaceholders(currentLyrics, initialPlaceholders);

  var lyricsForm = {
    title: "歌词编辑",
    message: "请编辑歌词（需要输入英文 请严格按照 类似于 spotify + + 形式输入）\n" +
            "[是] - 移除空格换行后复制，用于更新音符\n可使用粘贴所选音符歌词*脚本更新" +
            "[否] - 保留换行去除 - + 符号后复制，用于导出文本",
    buttons: "YesNoCancel",
    widgets: [
      {
        name: "placeholders",
        type: "TextArea",
        label: "词格参考",
        height: 100,
        default: initialPlaceholders,
        readonly: true
      },
      {
        name: "lyrics",
        type: "TextArea",
        label: "歌词编辑",
        height: 200,
        default: formattedLyrics
      }
    ]
  };

  var lyricsResult = SV.showCustomDialog(lyricsForm);
  if (lyricsResult.status === "Yes") {
    var spacedLyrics = lyricsResult.answers.lyrics.replace(/（\u3000）/g, ' ');
    spacedLyrics = spacedLyrics.replace(/([^a-zA-Z\s+-])/g, ' $1 ');
    var processedLyrics = spacedLyrics.replace(/\s+/g, ' ');
    processedLyrics = processedLyrics.replace(/([^ ])-(?=[^\s])/g, ' $1-');
    processedLyrics = processedLyrics.replace(/^\s+([a-zA-Z\u4e00-\u9fa5])/g, '$1');

    SV.setHostClipboard(processedLyrics);
    SV.beginUndoGroup();
    
    for (var i = 0; i < selectedNotes.length; i++) {
        var lyric = processedLyrics.split(" ")[i];
        if (!lyric || lyric === "○" || lyric === "x" || lyric === "X") {
            lyric = "la";
        }
        selectedNotes[i].setLyrics(lyric);
    }
    
    SV.endUndoGroup();
    SV.showMessageBox("成功", "歌词已更新到音符中");
  } else if (lyricsResult.status === "No") {
    var processedLyrics = lyricsResult.answers.lyrics
        .replace(/-/g, "")
        .replace(/\+/g, "")
        .split('\n')
        .map(function(line) {
            return line.replace(/\s+/g, ' ').trim();
        })
        .join('\n');
            
    SV.setHostClipboard(processedLyrics);
    SV.showMessageBox("提示", "歌词已复制到剪贴板（已移除-符号并规范化空格）\n" +
                        "您可以将其粘贴到文本编辑器中保存。");
  }
  
  SV.finish();
}