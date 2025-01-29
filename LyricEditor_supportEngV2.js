/**
 * 多步骤歌词编辑器(V2，移除确认步骤）
 * Copyright (c) 2025 河冰 (https://space.bilibili.com/11735521) 
 * Based on work by 凋零葉 (https://space.bilibili.com/13690791)
 * Licensed under the MIT License
 */

function getClientInfo() {
  return {
    "name": "多步骤歌词编辑器V2(移除确认步骤）",
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
    // 完全由英文字母或加号组成时添加中括号
    if (/^[a-zA-Z+-]+$/.test(noteLyric)) {
      noteLyric = "[" + noteLyric + "]";
    }
    
    lyrics += noteLyric;
    lastEnd = note.getOnset() + note.getDuration();
  }
  
  return lyrics;
}

function countPlaceholders(text) {
  var cleaned = text.replace(/\n/g, "");
  var matches = cleaned.match(/[○xX]/g);
  return matches ? matches.length : 0;
}

function formatLyricsWithPlaceholders(lyrics, placeholders) {
  var formattedLyrics = "";
  var lyricArray = [];
  
  // 按行分割歌词
  var lyricLines = lyrics.split("\n");
  
  // 处理每一行
  for (var lineIndex = 0; lineIndex < lyricLines.length; lineIndex++) {
    var line = lyricLines[lineIndex];
    var segments = line.split(/(\[.*?\]|\s+)/);  // 分割并保留中括号内容和空格
    
    // 处理当前行的内容
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (!segment) continue;
      
      // 处理空格（包括全角空格）
      if (/^[\s\u3000]+$/.test(segment)) {
        lyricArray.push(segment);
        continue;
      }
      
      // 处理"la"
      if (segment.toLowerCase() === "la") {
        lyricArray.push(segment);
        continue;
      }
      
      // 处理中括号内容 - 改动在这里
      if (/^\[.*?\]$/.test(segment)) {
        // 移除中括号，前后加空格
        lyricArray.push(" " + segment.slice(1, -1) + " ");
        continue;
      }
      
      // 处理其他字符
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

  // 按照词格格式化歌词
  var placeholderLines = placeholders.split("\n");
  var lyricIndex = 0;
  
  for (var i = 0; i < placeholderLines.length; i++) {
    // 分割词格行，保留空格
    var segments = placeholderLines[i].split(/(\s+)/);
    
    for (var s = 0; s < segments.length; s++) {
      var segment = segments[s];
      
      // 处理空格
      if (/^[\s\u3000]+$/.test(segment)) {
        formattedLyrics += segment;
        continue;
      }
      
      // 处理占位符部分
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
    
    // 添加换行符
    if (i < placeholderLines.length - 1) {
      formattedLyrics += "\n";
    }
  }

  return formattedLyrics;
}

function validatePlaceholders(text, noteCount) {
  return countPlaceholders(text) === noteCount;
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

  var placeholdersForm = {
    title: "步骤1：词格编辑",
    message: "当前选中 " + selectedNotes.length + " 个音符\n" +
            "请编辑词格排版（支持输入○ x X三种占位符以及全角、半角空格，占位符总数必须与音符数相同）\n" +
            "拼音和英语部分会作为整体处理，如果需要输入拼音/英文 请严格按照 类似于 pin yin / English + 这种单词前后跟随空格和对应的音节拆分符号",
    buttons: "YesNoCancel",
    widgets: [
      {
        name: "placeholders",
        type: "TextArea",
        label: "词格编辑（可用○ x X作为占位符）",
        height: 200,
        default: initialPlaceholders,
        onChange: function(newPlaceholders) {
          if (validatePlaceholders(newPlaceholders, selectedNotes.length)) {
            var newFormattedLyrics = formatLyricsWithPlaceholders(currentLyrics, newPlaceholders);
            this.panel.widgets.lyrics.value = newFormattedLyrics;
          }
        }
      },
      {
        name: "lyrics",
        type: "TextArea",
        label: "当前歌词预览",
        height: 200,
        default: formattedLyrics,
        readonly: true
      }
    ]
  };

  var placeholdersResult = SV.showCustomDialog(placeholdersForm);
  if (placeholdersResult.status === "Cancel") {
    SV.finish();
    return;
  }

  if (!validatePlaceholders(placeholdersResult.answers.placeholders, selectedNotes.length)) {
    SV.showMessageBox("错误", "词格占位符(○/x/X)的数量与音符数不匹配！");
    SV.finish();
    return;
  }

  var lyricsForm = {
    title: "步骤2：歌词编辑",
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
        default: placeholdersResult.answers.placeholders,
        readonly: true
      },
      {
        name: "lyrics",
        type: "TextArea",
        label: "歌词编辑",
        height: 200,
        default: formatLyricsWithPlaceholders(currentLyrics, placeholdersResult.answers.placeholders)
      }
    ]
  };

  var lyricsResult = SV.showCustomDialog(lyricsForm);
if (lyricsResult.status === "Yes") {
  // 1. 先将全角空格替换为半角空格
  var spacedLyrics = lyricsResult.answers.lyrics.replace(/（\u3000）/g, ' ');
  // 2. 给中文字符之间加空格
  spacedLyrics = spacedLyrics.replace(/([^a-zA-Z\s+-])/g, ' $1 ');
  // 3. 将多个空格替换为单个空格
  var processedLyrics = spacedLyrics.replace(/\s+/g, ' ');
  // 4. 确保每个-前面有空格，如果没有则添加空格
  processedLyrics = processedLyrics.replace(/([^ ])-(?=[^\s])/g, ' $1-');  // 这个正则是为了确保每个-前面有空格
   // 5. 删除第一个汉字或字母前的空格
  processedLyrics = processedLyrics.replace(/^\s+([a-zA-Z\u4e00-\u9fa5])/g, '$1');

  
  SV.setHostClipboard(processedLyrics);
    SV.beginUndoGroup();
    // 直接从 processedLyrics 中获取内容进行更新
    for (var i = 0; i < selectedNotes.length; i++) {
        var lyric = processedLyrics.split(" ")[i];
         // 如果没有对应的歌词，使用 "la"
        if (!lyric) {
              lyric = "la";
        }
        // 如果是占位符，也使用 "la"
        if (lyric === "○" || lyric === "x" || lyric === "X") {
            lyric = "la";
        }
        selectedNotes[i].setLyrics(lyric);
    }
    SV.endUndoGroup();
    SV.showMessageBox("成功", "歌词已更新到音符中");
  } else {
    SV.showMessageBox("提示", "操作已取消，歌词保持不变。");
  }
  
if (lyricsResult.status === "No") {
      // 对于导出文本，保留原有的换行格式，只移除-符号并规范化每行内的空格
  var processedLyrics = lyricsResult.answers.lyrics
      .replace(/-/g, "")  // 移除-符号
      .replace(/\+/g, "")  // 移除+符号
      .split('\n')  // 按行分割
      .map(function(line) {  // 处理每一行
          return line.replace(/\s+/g, ' ').trim();  // 规范化该行的空格
      })
      .join('\n');  // 重新用换行符连接
          
  SV.setHostClipboard(processedLyrics);
  SV.showMessageBox("提示", "歌词已复制到剪贴板（已移除-符号并规范化空格）\n" +
                      "您可以将其粘贴到文本编辑器中保存。");
  }
}