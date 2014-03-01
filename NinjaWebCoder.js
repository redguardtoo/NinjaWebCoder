// ==UserScript==
// @name        NinjaWebCoder
// @namespace   NinjaWebCoder
// @description manipulate code from internet like a ninja
// @include     *
// @version     1.0.0
// @grant       GM_setClipboard
// ==/UserScript==

// NinjaWebCoder.js --- manipulate code from internet like a ninja

// Copyright (C) 2014 Chen Bin <chenbin.sh@gmail.com>

// Author: Chen Bin <chenbin.sh@gmail.com>

// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 3
// of the License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

var ncoder_xpathSelector='//pre';
var ncoder_selectHintMode=false;
var ncoder_hintElements={}; // format, { "hotkey": <span> }
var ncoder_inputKey=''; // what user typed to select hint
var ncoder_hintColorForm='yellow';
var ncoder_hintColorCandidates='blue';
var ncoder_hintColorFocused='green';
var ncoder_lastMatchHint; // the matched hint, the one stand last

function ncoder_hintKeys(){
  return 'asdfghijkl';
}

function ncoder_doIt(elem){
  console.log("elem in ncoder_doIt=",elem);
  if(true){
    console.log("window=",window);
    console.log("GM_setClipboard=",GM_setClipboard);
    GM_setClipboard (elem.textContent);
    console.log("Into clipboard elem.textContent:"+elem.textContent);
  } else {
    console.log("elem.textContent"+elem.textContent);
  }
  return;
}

function ncoder_getAliveLastMatchHint() {
  try {
    if (ncoder_lastMatchHint && ncoder_lastMatchHint.style)
      return ncoder_lastMatchHint;
  } catch (x) {
    ncoder_lastMatchHint = null;
  }
  return null;
}

function ncoder_getStyle(elem){
  var style,win=window.content;
  if(win.getComputedStyle){
    //getComputedStyle is supported in ie9
    style=win.getComputedStyle(elem,null);
  } else {
    style=elem.currentStyle;
  }
  return style;
}

function ncoder_removeHints() {
  console.log('removeHints called');

  var hintContainer = document.getElementById('ncoder_hintContainer');

  if (document.body && hintContainer)
  {
    try {
      document.body.removeChild(hintContainer);
    } catch (x) {
      console.log(x);
    }
  }
}

function ncoder_getBodyOffsets()
{
  // http://d.hatena.ne.jp/edvakf/20100830/1283199419
  var body=document.body,
      rect,
      style = ncoder_getStyle(document.body),
      pos,
      x,
      y;

  if (style && style.position == 'relative') {
    rect = document.body.getBoundingClientRect();
    x= -rect.left-parseFloat(style.borderLeftWidth);
    y= -rect.top-parseFloat(style.borderTopWidth);
  } else {
    rect = document.documentElement.getBoundingClientRect();
    x= -rect.left;
    y= -rect.top;
  }
  return [x,y];
}

function ncoder_createHintsSeed () {
  var hintStyle={
    "position"       : 'absolute',
    "z-index"        : '2147483647',
    "color"          : '#000',
    "font-family"    : 'monospace',
    "font-size"      : '10pt',
    "font-weight"    : 'bold',
    "line-height"    : '10pt',
    "padding"        : '2px',
    "margin"         : '0px',
    "text-transform" : 'uppercase'
  };

  var sp=document.createElement('span');

  //copy the style
  var st=sp.style;
  for (var k in hintStyle) {
    if (hintStyle.hasOwnProperty(k)) {
      st[k] = hintStyle[k];
    }
  }
  st.backgroundcolor='red';
  return sp;
}

function ncoder_findCodeSnippets(){
  var arr=[];
  var xpathResult=document.evaluate(ncoder_xpathSelector,document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
  for (var i=0, len=xpathResult.snapshotLength; i<len; i++) {
    arr.push(xpathResult.snapshotItem(i));
  }
  console.log("len=",len);
  return arr;
}

function ncoder_drawHints(arr){
  // draw hints
  var docFragment = document.createDocumentFragment(),
      hintSpanSeed=ncoder_createHintsSeed(),
      hintContainer=document.createElement('div'),
      hintSpans=[],
      span,
      style,
      elem,
      offset,
      elemRect,
      hintCount=0;

  //prepare hint container
  hintContainer.style.position='static';
  hintContainer.id = 'ncoder_hintContainer';
  docFragment.appendChild(hintContainer);

  console.log("arr=",arr);

  for (var i=0, len=arr.length; i<len; i++) {
    elem=arr[i];
    elemRect=elem.getClientRects()[0];
    if(!elemRect){
      // display:none will goto here on firefox 20+
      console.log("0 i=",i);
      continue;
    }
    //make sure the elem visible
    // var r = elem.getBoundingClientRect();
    // if (!r || r.top > window.content.innerHeight ||
    //     r.bottom < 0 || r.left > window.content.innerWidth ||
    //     r.right < 0)
    // {
    //   console.log("r=",r);
    //   console.log("window.content.innerHeight=",window.content.innerHeight);
    //   console.log("window.content.innerWidth=",window.content.innerWidth);

    //   console.log("1 i=",i);

    //   continue;
    // }

    style=ncoder_getStyle(elem);
    if(!style || style.visibility!=="visible" || style.display==="none"){
      console.log("2 i=",i);
      continue;
    }

    console.log("i=",i);

    //cloneNode is supported by all the browsers
    span=hintSpanSeed.cloneNode(false);

    offset=ncoder_getBodyOffsets();
    span.style.left= (elemRect.left > 0 ? elemRect.left - offset[0] : -offset[0]) + 'px';
    span.style.top= (elemRect.top > 0 ? elemRect.top - offset[1] : - offset[1]) + 'px';
    span.style.backgroundColor = ncoder_hintColorForm;

    //link to original element
    span.element = elem;

    hintContainer.appendChild(span);
    hintSpans.push(span);
    hintCount++;
  }

  console.log("hintCount=",hintCount);

  // add text hints
  var textHints=ncoder_createTextHints(hintCount);
  for (i = 0; i < hintCount; i++) {
    span = hintSpans[i];
    span.appendChild(span.ownerDocument.createTextNode(textHints[i]));
    ncoder_hintElements[textHints[i]] = span;
  }

  // actually insert items into body from cache
  document.body.appendChild(docFragment);
  ncoder_selectHintMode=true;
  return hintCount;
}

// Patches from victor.vde@gmail.com
function ncoder_createTextHints(amount) {
  /* Explanation of the algorithm:
   * Case study 1:
   * suppose hintKeys is "0123", and need find the next("23")
   * step 1: prefix(p) of "23" is "2", remaining part is "3"
   * step 2: there is no "4" in hintKeys, so we use "0"
   * step 3: now next(23) is "20", wrong! should be next("2")+3
   * step 4: so it's 33
   *
   * Case study 2:
   * what's next("3")? we already have 4 candidates: '0', '1', '2', '3'
   * step 1: '3' => '0' ?
   * step 2: conflict, => '00', so 5 candidates: '0', '1', '2', '3', '00'
   *         this is not optimized, when you press '0', either '0' should be
   *         immediately selected or wait '00'?
   * step 3: delete '0' from candidates, so 4 candidate: '1', '2', '3', '00'
   * step 4: next('00') is 01, so 5 canidates '1', '2', '3', '00', '01'
   *
   * p means prefix; np means next prefix; n means next
   */
  var reverseHints = {};
  var numHints = 0;
  var hintKeys=ncoder_hintKeys();

  function next(hint) {
    var l = hint.length;
    if (l === 0) {
      return hintKeys.charAt(0);
    }
    var p = hint.substr(0, l - 1);
    // if hint is "ha", l is 2, hint.charAt(2-1) is 'a'
    // so the n := "asdfghijkl".indexOf('a')+1, n is 1
    var n = hintKeys.indexOf(hint.charAt(l - 1)) + 1;
    if (n == hintKeys.length) {
      var np = next(p);

      //unique only
      delete reverseHints[np];
      numHints--;

      return np + hintKeys.charAt(0);

    } else {
      return p + hintKeys.charAt(n);
    }
  }

  var hint = '';
  while (numHints < amount) {
    hint = next(hint);
    reverseHints[hint] = true;
    numHints++;
  }

  var hints = [];
  for (var k in reverseHints) {
    if (reverseHints.hasOwnProperty(k)) {
      hints.push(k);
    }
  }

  // Note: kind of relies on insertion order
  return hints;
}

function ncoder_keyEventToString(aEvent){
  var keyStr;

  // display.prettyPrint(
  //     ["char code :: " + aEvent.charCode,
  //      "key code  :: " + aEvent.keyCode,
  //      "ctrl      :: " + (aEvent.ctrlKey ? "on" : "off"),
  //      "alt       :: " + (aEvent.altKey ? "on" : "off"),
  //      "meta      :: " + (aEvent.metaKey ? "on" : "off"),
  //      "command   :: " + (aEvent.commandKey ? "on" : "off")].join("\n"));
  var isDisplayableKey=function(aEvent){
    return aEvent.charCode >= 0x20 && aEvent.charCode <= 0x7e;
  };

  var isControlKey = function (aEvent) {
    return aEvent.ctrlKey || aEvent.commandKey;
  };

  var isMetaKey = function (aEvent) {
    return aEvent.altKey || aEvent.metaKey;
  };

  if (isDisplayableKey(aEvent))
  {
    // ASCII displayable characters (0x20 : SPC)
    keyStr = String.fromCharCode(aEvent.charCode);
    if (aEvent.charCode == 0x20)
    {
      keyStr = "SPC";
    }
  }
  else if (aEvent.keyCode >= KeyEvent.DOM_VK_F1 &&
           aEvent.keyCode <= KeyEvent.DOM_VK_F24)
  {
    // function keys
    keyStr = "<f"
      + (aEvent.keyCode - KeyEvent.DOM_VK_F1 + 1)
      + ">";
  }
  else
  {
    // special charactors
    switch (aEvent.keyCode)
    {
    case KeyEvent.DOM_VK_ESCAPE:
      keyStr = "ESC";
      break;
    case KeyEvent.DOM_VK_RETURN:
    case KeyEvent.DOM_VK_ENTER:
      keyStr = "RET";
      break;
    case KeyEvent.DOM_VK_RIGHT:
      keyStr = "<right>";
      break;
    case KeyEvent.DOM_VK_LEFT:
      keyStr = "<left>";
      break;
    case KeyEvent.DOM_VK_UP:
      keyStr = "<up>";
      break;
    case KeyEvent.DOM_VK_DOWN:
      keyStr = "<down>";
      break;
    case KeyEvent.DOM_VK_PAGE_UP:
      keyStr = "<prior>";
      break;
    case KeyEvent.DOM_VK_PAGE_DOWN:
      keyStr = "<next>";
      break;
    case KeyEvent.DOM_VK_END:
      keyStr = "<end>";
      break;
    case KeyEvent.DOM_VK_HOME:
      keyStr = "<home>";
      break;
    case KeyEvent.DOM_VK_TAB:
      keyStr = "<tab>";
      break;
    case KeyEvent.DOM_VK_BACK_SPACE:
      keyStr = "<backspace>";
      break;
    case KeyEvent.DOM_VK_PRINTSCREEN:
      keyStr = "<print>";
      break;
    case KeyEvent.DOM_VK_INSERT:
      keyStr = "<insert>";
      break;
    case KeyEvent.DOM_VK_PAUSE:
      keyStr = "<pause>";
      break;
    case KeyEvent.DOM_VK_DELETE:
      keyStr = "<delete>";
    case 0xE2:
      /**
       * windows specific bug
       * When Ctrl + _ is pressed, the char code becomes 0, not the 95
       * and the key code becomes 242 (0xE2)
       */
      if (aEvent.ctrlKey)
        keyStr = "_";
      break;
    default:
      break;
    }
  }

  if (!keyStr){
    return null;
  }

  // append modifier
  if (isMetaKey(aEvent)){
    keyStr = "M-" + keyStr;
  }
  if (isControlKey(aEvent)){
    keyStr = "C-" + keyStr;
  }
  if (aEvent.shiftKey && (!isDisplayableKey(aEvent) || aEvent.charCode == 0x20)){
    keyStr = "S-" + keyStr;
  }

  return keyStr;
}

function ncoder_preventEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function ncoder_resetHintsColor() {
  var span;
  for (var k in ncoder_hintElements) {
    if (ncoder_hintElements.hasOwnProperty(k)) {
      span = ncoder_hintElements[k];
      span.style.backgroundColor = ncoder_hintColorForm;
      span.style.display = "inline";
    }
  }
}

function ncoder_updateHeaderMatchHints() {
  var hideUnmatchedHint = true,
      foundCount = 0,
      hintStr,
      hintElem;

  for (hintStr in ncoder_hintElements) {
    if (ncoder_hintElements.hasOwnProperty(hintStr)) {
      hintElem = ncoder_hintElements[hintStr];
      if (hintStr.indexOf(ncoder_inputKey) === 0) {
        if (hintStr != ncoder_inputKey)
          hintElem.style.backgroundColor = ncoder_hintColorCandidates;
        foundCount++;
      } else {
        if (hideUnmatchedHint){
            hintElem.style.display = "none";
        }
        hintElem.style.backgroundColor = ncoder_hintColorForm;
      }
    }
  }
  return foundCount;
}

function ncoder_onKeyPressFilterHint(event) {

  var keyStr = ncoder_keyEventToString(event),
      keyMap={
        '<delete>':'Delete',
        '<backspace>':'Backspace',
        'RET':'Enter'
      },
      keys=ncoder_hintKeys().split('');

  for (var i=0, len=keys.length; i<len; i++) {
    keyMap[keys[i]]=keys[i];
  }

  console.log("keyMap=",keyMap);

  if (!keyMap.hasOwnProperty(keyStr)) {
    ncoder_destruction(true);
    return;
  }

  var role = keyMap[keyStr];

  if (role === 'Delete') {
    ncoder_destruction();
    return;
  }

  if (role === 'Backspace') {
    //delete
    if (!ncoder_inputKey)
    {
      ncoder_destruction(true);
      return;
    }

    ncoder_inputKey = ncoder_inputKey.slice(0, ncoder_inputKey.length - 1);

    // reset but not exit
    ncoder_resetHintsColor();

    if (ncoder_inputKey.length != 0){
      //show the matched hints
      ncoder_updateHeaderMatchHints();
    }
  }

  if (role === 'Enter') {
    if (ncoder_getAliveLastMatchHint()) {
      ncoder_destruction();
      //do the real stuff
      ncoder_doIt(ncoder_lastMatchHint.element);
    } else {
      ncoder_destruction();
    }
    return;
  }

  ncoder_inputKey += role;

  event.preventDefault();
  event.stopPropagation();

  // look up <pre> by the ncoder_inputKey
  if (ncoder_hintElements.hasOwnProperty(ncoder_inputKey)) {
    //lastMatchHint is the item which focus on
    //for one key there is only one match
    ncoder_lastMatchHint = ncoder_hintElements[ncoder_inputKey];
    ncoder_lastMatchHint.style.backgroundColor= ncoder_hintColorFocused;
  } else {
    ncoder_lastMatchHint = null;
  }
  var foundCount = ncoder_updateHeaderMatchHints();
  if(foundCount===1 && ncoder_getAliveLastMatchHint() ) {
    ncoder_lastMatchHint.style.display='none';
    ncoder_destruction();
    ncoder_doIt(ncoder_lastMatchHint.element);
  }
  return;
}

function ncoder_destruction(){

  ncoder_inputKey='';
  ncoder_selectHintMode=false;
  ncoder_removeHints();

  //@see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.removeEventListener
  document.removeEventListener('keypress', ncoder_onKeyPressFilterHint,true);
  document.removeEventListener('keydown', ncoder_preventEvent,true);
  document.removeEventListener('keyup', ncoder_preventEvent,true);

  document.addEventListener('keypress',ncoder_onGeneralKeypress,true);

}

function ncoder_start(){
  console.log('copyCode called');

  //find items
  var hintCount=ncoder_drawHints(ncoder_findCodeSnippets());
  if(hintCount>1){
    document.addEventListener('keypress', ncoder_onKeyPressFilterHint,true);
    document.addEventListener('keydown', ncoder_preventEvent,true);
    document.addEventListener('keyup', ncoder_preventEvent,true);
  } else if (hintCount===1){
    ncoder_doIt(ncoder_lastMatchHint.element);
  } else  {
    //recover focus
    // remove hints, recover key press handlers
    ncoder_destruction(true);
  }
}

function ncoder_onGeneralKeypress (evt) {
  // if (keycodes.indexOf(evt.keyCode) != -1 ) {
  //     evt.cancelBubble = true;
  //     evt.stopImmediatePropagation();
  //     // alert("Gotcha!"); //uncomment to check if it's seeing the combo
  // }
  var keyStr=ncoder_keyEventToString(evt);

  if(keyStr==="r" && ncoder_selectHintMode === false){
    ncoder_start();
    ncoder_preventEvent(evt);
    return false;
  } else if(keyStr==='ESC'){
    ncoder_destruction();
    return false;
  }
  return true;
}

//init
document.addEventListener('keypress', ncoder_onGeneralKeypress, true);

// Local Variables:
// coding: utf-8
// indent-tabs-mode: nil
// mode: js2-mode
// tab-width: 2
// js2-basic-offset: 2
// End:
// vim: set fs=javascript fenc=utf-8 et ts=2 sts=2 sw=2

