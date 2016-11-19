'use strict'

import {OperationHelper} from 'apac';
import m from 'mithril';
import Config from 'config';

var app = {};

//appクラスは2つのプロパティを持つ
// dataは、amazon web servicesからの戻り値オブジェクト
app.Item = (data) => {
  // Title, DetailPageURL, MediumImageURL, ISBN
  this.title = m.prop(data.ItemAttributes.Title);
  this.DetailPageURL  = m.prop(data.DetailPageURL);
  this.MediumImageURL = m.prop(data.MediumImageURL.URL);
  this.isbn = m.prop(data.ItemAttributes.ISBN);
  this.asin = m.prop(data.ASIN);
};

//ItemListクラスはItemの配列
app.ItemList = Array;

//ビュー・モデルは表示されているTodoのリストを管理し、
//作成が完了する前のTodoの説明を格納したり、
//作成が可能かどうかを判定するロジックや、
//Todoが追加された後にテキスト入力をクリアする責務を持つ
app.vm = (function() {
  var vm = {};
  vm.init = () => {
    // 検索キーワード
    vm.searchWord = m.prop("");
    // アクティブなItemのリスト
    vm.list = new app.ItemList();

    // 検索
    vm.search = () => {

      var opHelper = new OperationHelper({
        locale:    'JP',
        awsId:      Config.awsId,
        awsSecret:  Config.awsSecret,
        assocId:    Config.assocId,
      });

      opHelper.execute('ItemSearch', {
        'SearchIndex': 'Books',
        'Keywords': vm.searchWord(),
        'ResponseGroup': 'Images,ItemAttributes,Offers'
      }).then((response) => {
        var items = response.result.ItemSearchResponse.Items.Item;
        vm.list = items;
        m.redraw();
      }).catch((err) => {
        console.error("Something went wrong! ", err);
      });
    };

    vm.createdlink = m.prop("");
  };
  return vm;
}());

//コントローラは、モデルの中のどの部分が、現在のページと関連するのかを定義している
//この場合は１つのビュー・モデルですべてを取り仕切っている
app.controller = function() {
    app.vm.init();

    // ResponseのitemからimageのURLを取得する。存在しなければ、dummyのURLを返す
    this.getImageURL = (item) => {
      if (!item.hasOwnProperty("MediumImage")) { return "http://dummy.jpg"}
      return item.MediumImage.URL;
    };

    // 価格を取得(たまに、値段が取得できないときがある)
    this.getPrice = (item) => {
      if (!item.hasOwnProperty("ItemAttributes")) { return "" }
      if (!item.ItemAttributes.hasOwnProperty("ListPrice")) { return "" }
      return item.ItemAttributes.ListPrice.FormattedPrice;
    };

    this.createlink = (item) => {
      var rakutenAffiUrl = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20130522?format=json&affiliateId=13e181b2.b5761023.13e181b3.cbc7b217&applicationId=1023136854815472269&isbn=' + item.ItemAttributes.ISBN;

      m.request({method: "GET", url: rakutenAffiUrl})
        .then((result) => {
          var url = "";
          url += item.MediumImage.URL;
          var src = url.replace(/http:\/\/ecx\.images-amazon\.com\/images\//, 'https://images-na.ssl-images-amazon.com/images/');
          var content =   '<div class="booklink-box">'
              +   '<div class="booklink-image">'
              +     '<a href=' + item.DetailPageURL + ">"
              +       '<img src="' + src + '" />'
              +     '</a>'
              +   '</div>'
              +   '<div class="booklink-info">'
              +     '<div class="booklink-name">'
              +       '<a href="http://www.amazon.co.jp/exec/obidos/asin/' + item.ASIN +'/meganii-22/">'
              +         item.ItemAttributes.Title
              +       '</a>'
              +     '</div>'
              +     '<div class="shoplinkamazon">'
              +       '<a href="http://www.amazon.co.jp/exec/obidos/asin/' + item.ASIN +'/meganii-22/">Amazonで買う</a>'
              +     '</div>'
              +     '<div class="shoplinkrakuten">'
              +       '<a href="' + result.Items[0].Item.affiliateUrl + '">楽天で買う</a>'
              +     '</div>'
              +   '</div>'
              + '</div>';
          app.vm.createdlink(content);
        });
    };
};

// viewの定義
app.view = (ctrl) => {
  return m("div", {class: "pure-g"}, [
    // <header>
    //   <h1>Mithril Todo App</h1>
    // </header>
    m("div", {class: "pure-u-1-3 pure-u-md-1-5 pure-u-lg-1-3"}, [
      m("h1", "Link Builder"),
      m("div", {class: "pure-form"}, [
        m("label", {for: "search-word"}, "検索条件"),
        m("input", {type: "text", onchange: m.withAttr("value", app.vm.searchWord), value: app.vm.searchWord()}),
        m("button", {class: "pure-button pure-button-primary", onclick: app.vm.search}, "検索する"),
      ])
    ]),
    m("div", {class: "pure-u-2-3 pure-u-md-2-5 pure-u-lg-2-3"}, [
      m("div", {class: "pure-form"}, [
        m("fieldset", [
          m("textarea", {class: "pure-input pure-u-1", rows: "5", value: app.vm.createdlink()})
        ])
      ])
    ]),
    m("div", {class: "pure-g"}, [
      app.vm.list.map((item, index) => {
        return m("div", {class: "pure-u-md-1-5 pure-u-lg-1-5 l-box", onclick: ctrl.createlink.bind(this, item) }, [
          // m("input", {type: "checkbox", onclick: ctrl.createlink.bind(this, item) }),
          m("img", {src: ctrl.getImageURL(item)}),
          m("div", {class: "left"}, [
            m("ul", [
              m("li", item.ASIN),
              m("li", item.ItemAttributes.Title),
              m("li", ctrl.getPrice(item))
            ])
          ]),
        ]);
      })
    ])
   ]);
 };

//アプリケーションの初期化
m.mount(document.getElementById("content"), {controller: app.controller, view: app.view});
