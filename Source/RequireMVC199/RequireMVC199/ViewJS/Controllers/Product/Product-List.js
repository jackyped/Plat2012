﻿define(['jshelper', 'cutetoolbar', 'fancybox', 'slickgrid'], function () {
    function render() {
        //数据加载
        pwpProductList.init();

        //产品表单对话框
        $("#productFormFancybox").fancybox({
            maxWidth: 600,
            maxHeight: 400,
            fitToView: false,
            width: '70%',
            height: '70%',
            autoSize: false,
            closeClick: false,
            openEffect: 'none',
            closeEffect: 'none'
        });

        //产品查询表单
        $("#productQueryFancybox").fancybox({
            maxWidth: 600,
            maxHeight: 400,
            fitToView: false,
            width: '70%',
            height: '70%',
            autoSize: false,
            closeClick: false,
            openEffect: 'none',
            closeEffect: 'none',
            // we won't use beforeClose but beforeShow
            beforeShow: function () {
                // get the value of pageload INSIDE the iframe
                //pageload = $('.fancybox-iframe').contents().find('#pageload').val();
                //alert("befor show query");
            },
            beforeClose: function () {
                var productTypeId = $("#hdnQueryProductTypeId").val();
                if (productTypeId) {
                    pwpProductList.init();
                }
            }
        });
    }

    //列表数据加载功能
    //命名空间
    var pwpProductList = (function () {
        //封装类
        var productListClass = {};

        //构造工具栏按钮
        productListClass.buildToolBar = function () {
            //require(['jquery', 'cutetoolbar'], function () {
            //alert($("#productCuteToolBar").length);
            console.log("before cutetoolbar container to be loaded...");
            if ($("#productCuteToolBar") == undefined || ($("#productCuteToolBar").length == 0))
                throw Error("toolbar div 未能加载，脚本执行过早！");

            $("#productCuteToolBar").cuteToolBarCtrl({
                defaultCRUDButtons: true,
                defaultPrefixName: "prefixProudctToolBar",
                //onSelectButton: function (e) {
                //    ;//alert("button selected");
                //}
            });

            $("#productCuteToolBar").cuteToolBarBind("search", pwpProductList.onSearchClick);
            $("#productCuteToolBar").cuteToolBarBind("add", pwpProductList.onAddClick);
            $("#productCuteToolBar").cuteToolBarBind("edit", pwpProductList.onEditClick);
            $("#productCuteToolBar").cuteToolBarBind("delete", pwpProductList.onDeleteClick);
            $("#productCuteToolBar").cuteToolBarBind("save", pwpProductList.onSaveClick);
            //});
        }

        //加载产品关联数据
        function loadProductTabPages(row) {
            $("#topTabBar").show();
            $("#bottomTabBar").show();

            var productId = row.ID;

            //product detail
            $("#topContainerProductForm").html("")
                .load('/RequireMVC199/Product/Detail/' + productId, function () {
                    $("#topContainerProductForm").focus();
                });

            //top order grid
            require(['Controllers/Order/Order-List'], function (orderListObject) {
                $("#topContainerOrderList").html("")
                    .load('/RequireMVC199/Order/List', function () {
                        orderListObject.buildToolBar();
                        $("#topContainerOrderList").focus();
                    });
            });

            //storage grid
            require(['Controllers/Storage/Storage-List'], function (stroageListObject) {
                $("#bottomContainerStorageList").html("")
                    .load('/RequireMVC199/Storage/List', function () {
                        $("#bottomContainerStorageList").focus();
                    });
            });

            //storage check grid
            $("#bottomContainerStorageCheckList").html("")
                .load('/RequireMVC199/StorageCheck/List', function () {
                    $("#bottomContainerStorageCheckList").focus();
                });
        }

        var gridProduct = null;
        var dsProduct = [];
        var changedItemsProduct = [];
        var dataViewProduct;

        //查询条件参数
        var productType = "";
        var productName = "";

        var columnsProduct = [
         { id: "id", name: "产品编号", field: "ID", width: 70, cssClass: "cell-title" },
         { id: "ProductName", name: "产品名称", field: "ProductName", width: 60 },
         { id: "ProductType", name: "产品类型", field: "ProductType", editor: Slick.Editors.Text },
         { id: "UnitPrice", name: "单价", field: "UnitPrice", editor: Slick.Editors.Text },
         { id: "Notes", name: "备注", field: "Notes", width: 120, editor: Slick.Editors.LongText }
        ];

        //添加复选框列
        var checkboxProduct = new Slick.CheckboxSelectColumn({
            cssClass: "slick-cell-checkboxsel"
        });
        columnsProduct.splice(0, 0, checkboxProduct.getColumnDefinition());

        var optionsProduct = {
            editable: true,
            enableAddRow: true,
            enableCellNavigation: true,
            asyncEditorLoading: true,
            forceFitColumns: false,
            enableColumnReorder: false
        };

        //加载数据的初始化操作
        productListClass.init = function() {
            //添加样式
            $(".grid-header .ui-icon")
                .addClass("ui-state-default ui-corner-all")
                .mouseover(function (e) {
                    $(e.target).addClass("ui-state-hover")
                })
                .mouseout(function (e) {
                    $(e.target).removeClass("ui-state-hover")
                });

            var productTypeId = $("#hdnQueryProductTypeId").val();
            if (productTypeId == undefined) {
                $.doHttpClientGet("/ProductSys.WebAPI/api/Product/Get",
                    function (dataJson) {
                        loadProductListCallback(dataJson);
                    });
            }
            else {
                $.doHttpClientGet("/ProductSys.WebAPI/api/Product/Get" + "?ProductType=" + productTypeId,
                  function (dataJson) {
                      loadProductListCallback(dataJson);
                  });
            }
        }

        function loadProductListCallback(dataJson) {
            dsProduct = dataJson;
            productListClass.fillData();
            console.log("product data loaded ok");
        }

        

        //初始化并加载数据
        productListClass.fillData = function() {
            dataViewProduct = new Slick.Data.DataView({ inlineFilters: true });
            gridProduct = new Slick.Grid($("#myGridProduct"), dataViewProduct, columnsProduct, optionsProduct);
            gridProduct.setSelectionModel(new Slick.RowSelectionModel());
            //gridProduct.setSelectionModel(new Slick.RowSelectionModel({ selectActiveRow: true }));
            var pager = new Slick.Controls.Pager(dataViewProduct, gridProduct, $("#myPagerProduct"));
            var columnpicker = new Slick.Controls.ColumnPicker(columnsProduct, gridProduct, optionsProduct);

            //注册复选框
            gridProduct.registerPlugin(checkboxProduct);

            //添加查询块
            $("#inlineFilterPanel")
                .appendTo(gridProduct.getTopPanel())
                .show();

            //新增记录
            gridProduct.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                gridProduct.invalidateRow(dsProduct.length);
                dsProduct.push(item);
                gridProduct.updateRowCount();
                gridProduct.render();
            });

            //编辑单元格数据
            gridProduct.onCellChange.subscribe(function (e, args) {
                var item = args.item;
                changedItemsProduct.push(item);
                dataViewProduct.updateItem(item.id, item);
            });

            //行双击事件
            gridProduct.onDblClick.subscribe(function (e, args) {
                var index = args.row;
                var item = dataViewProduct.getItemByIdx(index);
                //返回主UI的function
                if ($("#mainGridContainer") != undefined) {
                    //加载订单Tab页的数据
                    loadProductTabPages(item);
                }
            });

            //选择行改变事件
            //gridProduct.onSelectedRowsChanged.subscribe(function (e, args) {
            //    var index = args.rows[0];
            //    var item = dataViewProduct.getItemByIdx(index);
            //    parent.$mainGridRowSelected(item);
            //    //alert("changed...");
            //});

            //行改变
            dataViewProduct.onRowsChanged.subscribe(function (e, args) {
                gridProduct.invalidateRows(args.rows);
                gridProduct.render();
            });

            // wire up model events to drive the grid
            dataViewProduct.onRowCountChanged.subscribe(function (e, args) {
                gridProduct.updateRowCount();
                gridProduct.render();
            });

            dataViewProduct.onPagingInfoChanged.subscribe(function (e, pagingInfo) {
                var isLastPage = pagingInfo.pageNum == pagingInfo.totalPages - 1;
                var enableAddRow = isLastPage || pagingInfo.pageSize == 0;
                var options = gridProduct.getOptions();
            })

            dataViewProduct.beginUpdate();
            dataViewProduct.setItems(dsProduct, "ID");

            dataViewProduct.setFilterArgs({
                productType: productType,
                productName: productName
            });

            dataViewProduct.setFilter(myFilter);
            dataViewProduct.endUpdate();
            dataViewProduct.syncGridSelection(gridProduct, true);
        }

        //弹开新增页面
        productListClass.onAddClick = function() {
            var url = "/RequireMVC199/Product/Create";

            $("#productFormFancybox").attr("href", url);
            $("#productFormFancybox").click();
        };

        productListClass.onSearchClick = function() {
            var url = "/RequireMVC199/Product/Query";

            $("#productQueryFancybox").attr("href", url);
            $("#productQueryFancybox").click();
        };

        function getSelectedDataItem() {
            var selectedDataItem;
            var indexs = gridProduct.getSelectedRows();
            if (indexs != null && indexs[0] >= 0) {
                selectedDataItem = dataViewProduct.getItemByIdx(indexs[0]);
            }
            return selectedDataItem;
        }

        //编辑页面
        productListClass.onEditClick = function() {
            var item = getSelectedDataItem();
            var id = item.ID;
            var url = "/RequireMVC199/Product/Detail/" + id;

            $("#productFormFancybox").attr("href", url);
            $("#productFormFancybox").click();
        };

        //删除操作
        productListClass.onDeleteClick = function() {
            var delData = [];
            var isOk = confirm("确实要删除吗?");
            if (isOk) {
                var item = getSelectedDataItem();
                if (item != null && item.ID >= 0) {
                    delData.push(item.ID);
                    var jsonValue = JSON.stringify(delData);
                    $.doAjaxPost(
                        '/RequireMVC199/Product/Delete',
                        jsonValue,
                        function (data) {
                            alert(data);
                            //重新刷新页面
                            window.location.reload();
                        });
                }
                else {
                    alert("请选中要删除的记录，然后再删除!");
                }
            }
        };

        //保存操作
        productListClass.onSaveClick = function() {
            var jsonOrder = JSON.stringify(changedItemsProduct);
            $.doHttpClientUpdate(
                '/ProductSys.WebAPI/api/Product',
                jsonOrder,
                function (data) {
                    alert(data);
                });
            clearChangedItems();
        };

        function clearChangedItems() {
            changedItemsProduct = [];
        }

        //订单列表操作
        productListClass.onOrderListClick = function() {
            //$("#btnOrderList").click(function () {
            var productType,
                url = "/RequireMVC199/Order/List";

            var item = getSelectedDataItem();
            if (item != null) {
                url = url + "?ProductId=" + item.ID;
                //临时存产品主表ID，用作订单表页面过滤产品ID的参数条件
                $("#hdnShowOrderListByProductId").val(item.ID);
            }

            $("#OrderListDialog").addClass("easyui-dialog");
            $("#OrderListDialog").html("")
                .dialog({
                    title: 'Order List Dialog',
                    iconCls: 'icon-ok',
                    width: 850,
                    height: 550,
                    modal: true
                })
                .load(url);
        };

        function onAddRow() {
            //alert("on added row !");
            //var newRow = { title: "new Title", duration: "1 day" };
            //var rowData = grid.getData();
            //rowData.splice(0, 0, newRow);
            //grid.setData(rowData);
            //grid.render();
            //grid.scrollRowIntoView(0, false);
        }

        function onUpdateRow() {
            //alert("on updated row!");
        }

        function delRow() {
            //alert("on deleted row!");
            //var newRow = { title: "new Title", duration: "1 day" };
            //var rowData = grid.getData();
            //rowData.slice(0, 0, newRow);
            //grid.setData(rowData);
            //grid.render();
        }

        function toggleFilterRow() {
            gridProduct.setTopPanelVisibility(!gridProduct.getOptions().showTopPanel);
        }

        $("#txtQueryProductName").keyup(function (e) {
            Slick.GlobalEditorLock.cancelCurrentEdit();
            if (e.which == 27) {
                this.value = "";
            }
            productName = $(this).val();
            updateFilter();
        });

        $("#txtQueryProductType").keyup(function (e) {
            Slick.GlobalEditorLock.cancelCurrentEdit();
            if (e.which == 27) {
                this.value = "";
            }
            productType = $(this).val();
            updateFilter();
        });

        function updateFilter() {
            dataViewProduct.setFilterArgs({
                productType: productType,
                productName: productName
            });
            dataViewProduct.refresh();
        }

        function myFilter(item, args) {
            if (args.productName != "" && item["ProductName"].indexOf(args.productName) == -1) {
                return false;
            }

            if (args.productType != "" && item["ProductType"].indexOf(args.productType) == -1) {
                return false;
            }
            return true;
        }

        return productListClass;

    }());


    //渲染输出
    render();

    return {
        render: render,
        buildToolBar: pwpProductList.buildToolBar
    }
});