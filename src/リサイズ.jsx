/*===================================================================================================
	File Name: リサイズ.jsx
	Title: リサイズ
	Version: 1.1.0
	Author: show555
	Description: 選択したフォルダ内の画像を指定した長辺のサイズでリサイズする
	Includes: Underscore.js,
	          Underscore.string.js
===================================================================================================*/

#target photoshop

// Photoshopの設定単位を保存
var originalRulerUnits = app.preferences.rulerUnits;
// Photoshopの設定単位をピクセルに変更
app.preferences.rulerUnits = Units.PIXELS;

// 初期設定
var settings = {
	folderPath: '',        // 対象フォルダのパスの初期値
	_fileTypes: {
		init: [ 'JPG' ],     // 対象ファイルタイプのデフォルトチェック JPG／GIF／PNG／EPS／TIFF／BMP
		regex: {
			JPG:  '\\.jpe?g',
			GIF:  '\\.gif',
			PNG:  '\\.png',
			EPS:  '\\.eps',
			TIFF: '\\.tiff?',
			BMP:  '\\.bmp',
		}
	},
	colorMode: 'RGB',      // カラーモードの初期値
	maxpx: 600,            // 長辺のサイズの初期値
	_quality: {
		jpgWeb: {
			init: 90,          // 保存画質（Web用JPG）の初期値
			min:  0,
			max:  100
		},
		jpgDtp: {
			init: 10,          // 保存画質（DTP用JPG）の初期値
			min:  0,
			max:  12
		},
	},
	doNotEnlarge: false,   // 画像の長辺が指定サイズ以下の場合拡大しないの初期値
	save: {
		init: 'JPG',         // 保存形式の初期値
		type: {
			jpgWeb: { label: 'JPG（WEB用）', extension: 'jpg' },
			jpgDtp: { label: 'JPG', extension: 'jpg' },
			eps:    { label: 'EPS', extension: 'eps' },
			png:    { label: 'PNG', extension: 'png' }
		},
		dir: 'resize'        // 保存先のディレクトリ名
	},
	fileTypes: [],
	saveType: '',
	quality: '',
	folderObj: {}
};

// ----------------------------------▼ Underscore.js ▼----------------------------------
#include "underscore.inc"
#include "underscore.string.inc"
_.mixin(_.string.exports());
// ----------------------------------▲ Underscore.js ▲----------------------------------

// 保存関数
var saveFunctions = {
	jpgWeb: function( theDoc, newFile, settings ) {
		var jpegOpt       = new ExportOptionsSaveForWeb();
		jpegOpt.format    = SaveDocumentType.JPEG;
		jpegOpt.optimized = true;
		jpegOpt.quality   = settings.quality;
		theDoc.exportDocument( newFile, ExportType.SAVEFORWEB, jpegOpt );
	},
	jpgDtp: function( theDoc, newFile, settings ) {
		var jpegOpt     = new JPEGSaveOptions();
		jpegOpt.quality = settings.quality;
		theDoc.saveAs( newFile, jpegOpt, true, Extension.LOWERCASE );
	},
	eps: function( theDoc, newFile, settings ) {
		var epsOpt               = new EPSSaveOptions();
		epsOpt.embedColorProfile = true;
		epsOpt.encoding          = SaveEncoding.JPEGMAXIMUM;
		epsOpt.halftoneScreen    = false;
		epsOpt.interpolation     = false;
		epsOpt.preview           = Preview.MACOSEIGHTBIT;
		epsOpt.psColorManagement = false;
		epsOpt.transferFunction  = false;
		epsOpt.transparentWhites = false;
		epsOpt.vectorData        = false;
		theDoc.saveAs( newFile, epsOpt, true, Extension.LOWERCASE );
	},
	png: function( theDoc, newFile, settings ) {
		var pngOpt        = new PNGSaveOptions();
		pngOpt.interlaced = false;
		theDoc.saveAs( newFile, pngOpt, true, Extension.LOWERCASE );
	}
};

// 実行フラグ
var do_flag = true;

// ---------------------------------- ダイアログ作成 ----------------------------------
// ダイアログオブジェクト
var uDlg = new Window( 'dialog', 'リサイズ', { x:0, y:0, width:400, height:380 } );

// ダイアログを画面に対して中央揃えに
uDlg.center();

// パネル 対象フォルダ
uDlg.folderPnl           = uDlg.add( "panel",    { x:10,  y:10, width:380, height:60 }, "対象フォルダ" );
uDlg.folderPnl.path      = uDlg.add( "edittext", { x:25,  y:30, width:270, height:25 }, settings.folderPath );
uDlg.folderPnl.selectBtn = uDlg.add( "button",   { x:300, y:30, width:75,  height:25 }, "選択" );
// 対象フォルダ選択ボタンが押された時の処理
uDlg.folderPnl.selectBtn.onClick = function() {
	var oldPath = uDlg.folderPnl.path.text;
	uDlg.folderPnl.path.text = Folder.selectDialog( 'フォルダを選択してください' ) || oldPath;
}

// パネル 対象ファイルタイプ
uDlg.fileTypePnl     = uDlg.add( "panel", { x:10, y:80, width:380, height:60 }, "対象ファイルタイプ" );
uDlg.fileTypePnl.ext = [];
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:25,  y:100, width:50, height:25 }, "JPG" ) );
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:85,  y:100, width:50, height:25 }, "GIF" ) );
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:145, y:100, width:50, height:25 }, "PNG" ) );
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:205, y:100, width:50, height:25 }, "EPS" ) );
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:265, y:100, width:50, height:25 }, "TIFF" ) );
uDlg.fileTypePnl.ext.push( uDlg.add( "checkbox", { x:325, y:100, width:50, height:25 }, "BMP" ) );
_.each( uDlg.fileTypePnl.ext, function( item, key ) {
	if ( _.contains( settings._fileTypes.init, item.text ) ) {
		item.value = true;
	}
} );

// パネル 書き出し設定
var saveTypeList = _.pluck( settings.save.type, 'label' );
uDlg.resizePnl               = uDlg.add( "panel",        { x:10,  y:150, width:380, height:180 }, "書き出し設定" );
uDlg.resizePnl.colorModeText = uDlg.add( "statictext",   { x:25,  y:175, width:70,  height:20  }, "モード:" );
uDlg.resizePnl.saveTypeText  = uDlg.add( "statictext",   { x:25,  y:205, width:70,  height:20  }, "保存形式:" );
uDlg.resizePnl.saveType      = uDlg.add( "dropdownlist", { x:105, y:203, width:110, height:22  }, saveTypeList );
uDlg.resizePnl.maxpxText     = uDlg.add( "statictext",   { x:25,  y:235, width:70,  height:20  }, "長辺の長さ:" );
uDlg.resizePnl.maxpx         = uDlg.add( "edittext",     { x:105, y:233, width:50,  height:22  }, settings.maxpx );
uDlg.resizePnl.unitText      = uDlg.add( "statictext",   { x:160, y:235, width:20,  height:20  }, "px" );
uDlg.resizePnl.qualityText   = uDlg.add( "statictext",   { x:25,  y:265, width:70,  height:20  }, "画質:" );
uDlg.resizePnl.quality       = uDlg.add( "edittext",     { x:105, y:263, width:50,  height:22  }, settings._quality.jpgDtp.init );
uDlg.resizePnl.qualityRange  = uDlg.add( "statictext",   { x:160, y:265, width:60,  height:20  }, "(0〜" + settings._quality.jpgDtp.max + ")" );
uDlg.resizePnl.qualitySlider = uDlg.add( "slider",       { x:215, y:260, width:160, height:20  }, settings._quality.jpgDtp.init, settings._quality.jpgDtp.min, settings._quality.jpgDtp.max );
uDlg.resizePnl.doNotEnlarge  = uDlg.add( "checkbox",     { x:25,  y:293, width:350, height:20  }, "画像の長辺が指定サイズ以下の場合拡大しない" );
uDlg.resizePnl.colorModeText.justify = uDlg.resizePnl.saveTypeText.justify = uDlg.resizePnl.maxpxText.justify = uDlg.resizePnl.qualityText.justify = 'right';
// カラーモード選択ラジオボタンの追加
uDlg.resizePnl.colorMode      = uDlg.add( "group", { x:105, y:175, width:245, height:20 } );
uDlg.resizePnl.colorMode.RGB  = uDlg.resizePnl.colorMode.add( "radiobutton",  { x:0,  y:0, width:50, height:20 }, "RGB" );
uDlg.resizePnl.colorMode.CMYK = uDlg.resizePnl.colorMode.add( "radiobutton",  { x:55, y:0, width:70, height:20 }, "CMYK" );
// カラーモードの初期値を設定
uDlg.resizePnl.colorMode[settings.colorMode].value = true;
// “画像の長辺が指定サイズ以下の場合拡大しない”チェックボックスの初期値を設定
uDlg.resizePnl.doNotEnlarge.value = settings.doNotEnlarge;

// 保存形式の初期値を設定
uDlg.resizePnl.saveType.selection = _.indexOf( saveTypeList, settings.save.init );
setSaveTypeQuality( settings.save.init );
// 保存形式が変更された時の処理
uDlg.resizePnl.saveType.onChange = function() {
	setSaveTypeQuality( uDlg.resizePnl.saveType.selection.text );
}
// 画質のスライダーを動かしている時の処理
uDlg.resizePnl.qualitySlider.onChanging = function() {
	uDlg.resizePnl.quality.text = parseInt( uDlg.resizePnl.qualitySlider.value );
}
// 画質を入力した時の処理
uDlg.resizePnl.quality.onChange = function() {
	uDlg.resizePnl.qualitySlider.value = parseInt( uDlg.resizePnl.quality.text );
}

// キャンセルボタン
uDlg.cancelBtn = uDlg.add( "button", { x:95, y:340, width:100, height:25 }, "キャンセル", { name: "cancel" } );
// キャンセルボタンが押されたらキャンセル処理（ESCキー含む）
uDlg.cancelBtn.onClick = function() {
	// 実行フラグにfalseを代入
	do_flag = false;
	// ダイアログを閉じる
	uDlg.close();
}

// OKボタン
uDlg.okBtn = uDlg.add( "button", { x:205, y:340, width:100, height:25 }, "リサイズ実行", { name: "ok" } );
// OKボタンが押されたら各設定項目に不備がないかチェック
uDlg.okBtn.onClick = function() {
	// 各種項目の値を格納
	settings.folderPath   = uDlg.folderPnl.path.text;
	settings.folderObj    = new Folder( settings.folderPath );
	settings.colorMode    = uDlg.resizePnl.colorMode.RGB.value ? 'RGB' : 'CMYK';
	settings.saveType     = getSaveTypeKey( uDlg.resizePnl.saveType.selection.text );
	settings.maxpx        = parseInt( uDlg.resizePnl.maxpx.text );
	settings.doNotEnlarge = uDlg.resizePnl.doNotEnlarge.value;
	settings.fileTypes    = [];
	_.each( uDlg.fileTypePnl.ext, function( item ) {
		if ( item.value ) {
			settings.fileTypes.push( item.text );
		}
	} );

	// 対象フォルダが選択されているかチェック
	if ( !settings.folderPath ) {
		alert( '対象フォルダが選択されていません' );
		return false;
	}
	// 対象フォルダが存在するかチェック
	if ( !settings.folderObj.exists ) {
		alert( '対象フォルダが存在しません' );
		return false;
	}
	// 拡張子が最低1つは選択されているかチェック
	if ( settings.fileTypes.length < 1 ) {
		alert( '対象ファイルタイプが選択されていません' );
		return false;
	}
	// カラーモードがCMYKの時保存形式がPNGになっていないかチェック
	if ( settings.colorMode == 'CMYK' ) {
		if ( settings.saveType == 'jpgWeb' ) {
			alert( 'JPG（WEB用）形式で保存するためにはカラーモードはRGBでなければいけません' );
			return false;
		}
		if ( settings.saveType == 'png' ) {
			alert( 'PNG形式で保存するためにはカラーモードはRGBでなければいけません' );
			return false;
		}
	}
	// 長辺の長さが入力されているかチェック
	if ( _.isNaN( settings.maxpx ) ) {
		alert( '長辺の長さを整数で入力して下さい' );
		return false;
	}
	// 長辺の長さが0より大きいかチェック
	if ( settings.maxpx < 1 ) {
		alert( '0より大きい長辺の長さを入力しください' );
		return false;
	}
	// 保存形式がJPG／JPG（WEB用）の場合
	if ( _.contains( [ 'jpgWeb', 'jpgDtp' ], settings.saveType ) ) {
		// 画質が入力されているかチェック
		settings.quality = parseInt( uDlg.resizePnl.quality.text );
		if ( _.isNaN( settings.quality ) ) {
			alert( '画質を整数で入力して下さい' );
			return false;
		}
	}
	// 不備がなかった場合処理続行
	uDlg.close();
}

// ダイアログ表示
uDlg.show();

// ---------------------------------- メインリサイズ処理 ----------------------------------
if ( do_flag ) {
	// alert( 'フォルダ:' + uDlg.folderPnl.path.text + "\n" + '拡張子：' + settings.fileTypes.join( ', ' ) + "\n" + 'モード：' + settings.colorMode + "\n" + '保存形式：' + settings.saveType + "\n" + '長辺のサイズ：' + settings.maxpx + "\n" + '画質：' + settings.quality + "\n" + '画像が小さい場合拡大しない：' + settings.doNotEnlarge );

	// 複数の対象ファイルを取得するための正規表現オブジェクトを作成
	var extensions = [];
	_.each( settings.fileTypes, function( fileType ) {
		extensions.push( settings._fileTypes.regex[fileType] );
	} );
	var fileReg = new RegExp( '(' + extensions.join( '|' ) + ')$', 'i' );
	// 対象ファイルを取得
	var files   = settings.folderObj.getFiles( function( thefile ) {
		if ( fileReg.test( thefile.name ) ) {
			return true;
		} else {
			return false;
		}
	} );

	// 進捗バーを表示
	var ProgressPanel = CreateProgressPanel( files.length, 500, '処理中…', true );
	ProgressPanel.show();
	var i = 1;

	// 対象ファイルに対してリサイズ→保存のループ処理
	_.each( files, function( file ) {
		// キャンセルの場合処理中止
		if ( !do_flag ) return;
		// 進捗バーを更新
		ProgressPanel.val( i );
		// ファイルオープン
		var theDoc = app.open( file );
		// カラーモードをRGBに変更
		theDoc.changeMode( ChangeMode[settings.colorMode] );
		//リサイズする
		var w = theDoc.width.value;
		var h = theDoc.height.value;
		if ( w > h && judgeResizeable( w, h ) ) {
			theDoc.resizeImage( settings.maxpx, h * ( settings.maxpx/w ), 72, ResampleMethod.BICUBICSHARPER );
		} else if ( h >= w && judgeResizeable( w, h ) ) {
			theDoc.resizeImage( w * ( settings.maxpx/h ), settings.maxpx, 72, ResampleMethod.BICUBICSHARPER );
		}
		// 保存先フォルダを作成
		var saveDir = new Folder( theDoc.path + '/' + settings.save.dir );
		if( !saveDir.exists ){
			saveDir.create();
		}
		// 保存用の新規オブジェクト作成
		var newFile = new File( theDoc.path + '/' + settings.save.dir + '/' + theDoc.name.replace( /\.\w+$/i, '' ) + '.' + settings.save.type[settings.saveType].extension );
		// 保存形式ごとの関数を呼び出し
		saveFunctions[settings.saveType]( theDoc, newFile, settings );
		// ファイルクローズ
		theDoc.close( SaveOptions.DONOTSAVECHANGES );

		i++;
	} );
}
if ( ProgressPanel ) {
	ProgressPanel.close();
}

// Photoshopの設定単位を復元
app.preferences.rulerUnits = originalRulerUnits;

// ------------------------------------------ 関数 -----------------------------------------
function setSaveTypeQuality( saveType ) {
	var key = getSaveTypeKey( saveType );
	if ( _.contains( [ 'jpgWeb', 'jpgDtp' ], key ) ) {
		uDlg.resizePnl.quality.text           = settings._quality[key].init;
		uDlg.resizePnl.qualityRange.text      = "(" + settings._quality[key].min + "〜" + settings._quality[key].max + ")";
		uDlg.resizePnl.qualitySlider.minvalue = settings._quality[key].min;
		uDlg.resizePnl.qualitySlider.maxvalue = settings._quality[key].max;
		uDlg.resizePnl.qualitySlider.value    = settings._quality[key].init;
		uDlg.resizePnl.qualityText.enabled    = true;
		uDlg.resizePnl.qualityRange.enabled   = true;
		uDlg.resizePnl.quality.enabled        = true;
		uDlg.resizePnl.qualitySlider.enabled  = true;
	} else {
		uDlg.resizePnl.qualityText.enabled    = false;
		uDlg.resizePnl.qualityRange.enabled   = false;
		uDlg.resizePnl.quality.enabled        = false;
		uDlg.resizePnl.qualitySlider.enabled  = false;
	}
}

function getSaveTypeKey( saveType ) {
	var saveTypeKey;
	_.some( settings.save.type, function( value, key ) {
		if ( value.label == saveType ) {
			saveTypeKey = key;
			return true;
		}
		return false;
	} );
	return saveTypeKey;
}

function judgeResizeable( w, h ) {
	if ( w > settings.maxpx || h > settings.maxpx ) {
		return true;
	}
	if ( w < settings.maxpx && h < settings.maxpx && !settings.doNotEnlarge ) {
		return true;
	}
	return false;
}

function CreateProgressPanel( myMaximumValue, myProgressBarWidth , progresTitle, useCancel ) {
	var progresTitle = typeof progresTitle == 'string' ? progresTitle : 'Processing...';
	myProgressPanel = new Window( 'palette', _.sprintf( "%s(%d/%d)", progresTitle, 1, myMaximumValue ) );
	myProgressPanel.myProgressBar = myProgressPanel.add( 'progressbar', [ 12, 12, myProgressBarWidth, 24 ], 0, myMaximumValue );
	if ( useCancel ) {
		myProgressPanel.cancel = myProgressPanel.add( 'button', undefined, 'キャンセル' );
		myProgressPanel.cancel.onClick = function() {
			try {
				do_flag = false;
				myProgressPanel.close();
			} catch(e) {
				alert(e);
			}
		}
	}
	var PP = {
		'ProgressPanel': myProgressPanel,
		'title': progresTitle,
		'show': function() { this.ProgressPanel.show() },
		'close': function() { this.ProgressPanel.close() },
		'max': myMaximumValue,
		'barwidth': myProgressBarWidth,
		'val': function( val ) {
			this.ProgressPanel.myProgressBar.value = val;
			if ( val < this.max ) {
				this.ProgressPanel.text = _.sprintf( "%s(%d/%d)", this.title, val+1, this.max );
			}
			this.ProgressPanel.update();
		}
	}
	return PP;
}