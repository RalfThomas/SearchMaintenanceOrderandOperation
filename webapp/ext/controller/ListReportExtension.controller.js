sap.ui.define([
    "zi2d/eam/orderandoperation/monitors1/ext/controls/ExtScanner",
    "sap/m/MessageToast",
	"sap/ui/model/json/JSONModel"
], function (ExtScanner, MessageToast, JSONModel) {
    "use strict";
    return sap.ui.controller("zi2d.eam.orderandoperation.monitors1.ext.controller.ListReportExtension", {

        onInit: function () {
            this.oScanner = new ExtScanner({
                settings: true,
                valueScanned: this.onScanned.bind(this),
                decoderKey: 'PDF417-UII',
                decoders: this.getDecoders(),
            });

            this._oBusyDialog = new sap.m.BusyDialog();

           var oViewModel = new JSONModel({
				PersonnelNumber: "00000000"
			});
			this.getView().setModel(oViewModel, "viewModel");
        },

        onAfterRendering: function () {
            var btn = this.getView().byId("zi2d.eam.orderandoperation.monitors1::sap.suite.ui.generic.template.ListReport.view.ListReport::ZC_ObjPgMaintOrderAndOperation--Scan");
            if (btn) {
                btn.setIcon("sap-icon://bar-code");
            }
        },

        aOrderTypes: [],

        adaptTransientMessageExtension: function () {
            var oMessageManager = sap.ui.getCore().getMessageManager(),
                oMessageModel = oMessageManager.getMessageModel(),
                aMessages = oMessageModel.getData();

            if (aMessages.length) {
                aMessages.forEach(function (mMessage) {
                    if (mMessage.type === sap.ui.core.MessageType.Error && mMessage.code === "/BOBF/FRW_COMMON/094") {
                        var oNewMessage = new sap.ui.core.message.Message({
                            target: mMessage.target,
                            type: sap.ui.core.MessageType.Error,
                            persistent: true,
                            message: this.oView.getModel("@i18n").getProperty("xmsg.statusOfNotificationDoesNotAllowChanges")
                        });
                        oMessageManager.removeMessages(mMessage);
                        oMessageManager.addMessages(oNewMessage);
                    }
                }.bind(this), []);
            }
        },

        onNavigateToOpenNotifications: function (oEvent) {

            var oMaintenanceNotification = oEvent.getSource().getBindingContext().getObject();

            this.extensionAPI.getNavigationController().navigateExternal("showOpenNotifications", {
                TechnicalObjectLabel: oMaintenanceNotification.TechnicalObjectLabel,
                TechObjIsEquipOrFuncnlLoc: oMaintenanceNotification.TechObjIsEquipOrFuncnlLoc,
                NotifProcessingPhase: "1", // Outstanding,
                scenario: "open" // Navigate to "Open Notifications for Technical Object" variant
            });
        },

        onLongTextDialogClose: function (oEvent) {
            oEvent.getSource().getParent().close();
        },

        onChangeAssignmentPressed: function () {
            var oModel = this.getView().getModel(),
                oContexts = this.extensionAPI.getSelectedContexts();

            var oDialog = sap.ui.xmlfragment("zi2d.eam.orderandoperation.monitors1.ext.fragments.ChangeAssignmentDialog", jQuery.extend({}, this, {
                afterDialogClosed: function () {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                onCancelPressed: function () {
                    oDialog.close();
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                onOkPressed: function () {
                    var sMainWorkCenter = sap.ui.getCore().byId("notificationChangeAssignmentWorkCenterField").getValue();
                    var sMainWorkCenterPlant = sap.ui.getCore().byId("notificationChangeAssignmentWorkCenterPlantField").getValue();
                    var sMaintenancePlannerGroup = sap.ui.getCore().byId("notificationChangeAssignmentMaintenancePlannerGroupField").getValue();
                    var sMaintenancePlanningPlant = sap.ui.getCore().byId("notificationChangeAssignmentMaintenancePlanningPlantField").getValue();
                    var that = this;

                    if (!sMainWorkCenter && !sMainWorkCenterPlant && !sMaintenancePlannerGroup && !sMaintenancePlanningPlant) {
                        return; //sap.m.MessageBox.error(oI18nModel.getProperty("@SelectOrderMessage"), {});
                    } else {

                        oDialog.close();

                        that._CallFunction("/ChangeResponibility", "POST", {
                            "MaintenancePlannerGroup": sMaintenancePlannerGroup,
                            "MaintenancePlanningPlant": sMaintenancePlanningPlant,
                            "MainWorkCenter": sMainWorkCenter,
                            "MainWorkCenterPlant": sMainWorkCenterPlant,
                            "PersonResponsible": ""
                        });
                    }
                }
            }));

            oContexts.sort(); //sort to ensure that the notification with the smallest ID always be assigned to the order's header level

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            oDialog.setModel(oModel);
            oDialog.setBindingContext(oContexts[0]);
            this.getView().addDependent(oDialog);

            oDialog.open();
        },


        onChangeSchedulingPressed: function () {
            var oModel = this.getView().getModel(),
                oContexts = this.extensionAPI.getSelectedContexts();

            var that = this;

            var oDialog = sap.ui.xmlfragment("zi2d.eam.orderandoperation.monitors1.ext.fragments.ChangeSchedulingDialog", jQuery.extend({}, this, {
                afterDialogClosed: function () {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                onCancelPressed: function () {
                    oDialog.close();
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                onOkPressed: function () {
                    var sMaintPriority = sap.ui.getCore().byId("notificationChangeSchedulingPriorityField").getValue();
                    var sRequiredStartDate = sap.ui.getCore().byId("notificationChangeSchedulingRequiredStartDateGroupElement").getValue();
                    var sRequiredEndDate = sap.ui.getCore().byId("notificationChangeSchedulingRequiredEndDateGroupElement").getValue();
                    // var sPath = sap.ui.getCore().byId("notificationChangeSchedulingRequiredStartDateGroupElement").getBindingContext().sPath;
                    // var sRequiredStartDate = that.getView().getModel().getProperty(sPath + "/RequiredStartDate");
                    // var sRequiredEndDat = that.getView().getModel().getProperty(sPath + "/RequiredEndDate");
                    var dRequiredStartDate = new Date();
                    dRequiredStartDate.setFullYear(sRequiredStartDate.substr(6, 4), sRequiredStartDate.substr(3, 2), sRequiredStartDate.substr(0, 2)); //(Jahr, Monat, Tag)
                    dRequiredStartDate.setMonth(dRequiredStartDate.getMonth() - 1);
                    var dRequiredEndDate = new Date();
                    dRequiredEndDate.setFullYear(sRequiredEndDate.substr(6, 4), sRequiredEndDate.substr(3, 2), sRequiredEndDate.substr(0, 2));
                    dRequiredEndDate.setMonth(dRequiredEndDate.getMonth() - 1);
                    if (!sMaintPriority) {
                        sMaintPriority = "";
                    }
                    oDialog.close();
                    that._CallFunction("/ChangeScheduling", "POST", {
                        "MaintPriority": sMaintPriority,
                        "RequiredStartDate": dRequiredStartDate,
                        "RequiredEndDate": dRequiredEndDate
                    });

                }
            }));

            oContexts.sort(); //sort to ensure that the notification with the smallest ID always be assigned to the order's header level

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            oDialog.setModel(oModel);
            oDialog.setBindingContext(oContexts[0]);
            this.getView().addDependent(oDialog);

            //this.readPriorityRequiredDates();

            var mViewData = {};
            mViewData.RequiredStartDate = new Date();
            mViewData.RequiredEndDate = new Date();
            var oViewModel = new sap.ui.model.json.JSONModel(mViewData);
            oDialog.setModel(oViewModel, "viewModel");

            oDialog.open();
            this.setFilterPriorityType();
            //"notificationChangeSchedulingPriorityField-input-valueHelpDialog-smartFilterBar-filterItemControlA_-MaintPriorityType"
        },

        setFilterPriorityType: function () {
            // var oFilter = sap.ui.getCore().byId("notificationChangeSchedulingPriorityField-input-valueHelpDialog-smartFilterBar-filterItemControlA_-MaintPriorityType");
            // if (oFilter) {
            //     var aTokens = [];
            //     aTokens.push(new sap.m.Token({
            //         key: "ZD",
            //         text: "ZD"
            //     }));
            //     oFilter.setTokens(aTokens);
            // }
        },

        changeSchedulingPriority: function (oEvent) {
            var table = sap.ui.getCore().byId("notificationChangeSchedulingPriorityField-input-valueHelpDialog-table");
            if (table.getSelectedIndices && table.getSelectedIndices().length > 0 && table.getContextByIndex) {
                var sMaintPriorityType = table.getContextByIndex(table.getSelectedIndices()[0]).getObject().MaintPriorityType;

                var sPriority = oEvent.getSource().getValue();
                this.readPriorityRequiredDates(sPriority, sMaintPriorityType);
            }

        },

        readPriorityRequiredDates: function (sPriority, sMaintPriorityType) {
            var oUrlParam = {};

            var that = this;
            var oModel = this.getView().getModel();
            if (!sPriority || sPriority === "" || !sMaintPriorityType || sMaintPriorityType === "") {
                return;
            }

            var aSelectedContexts = that.extensionAPI.getSelectedContexts();

            oUrlParam.MaintPriority = sPriority;
            oUrlParam.MaintPriorityType = sMaintPriorityType;
            that._oBusyDialog.open();
            oModel.callFunction("/GetRequiredDates", {
                method: "POST",
                urlParameters: oUrlParam,
                success: function (oData, test) {
                    if (oData) {

                        // sap.ui.getCore().byId("notificationChangeSchedulingRequiredStartDateGroupElement").setValue(oData.Startdate);
                        // sap.ui.getCore().byId("notificationChangeSchedulingRequiredEndDateGroupElement").setValue(oData.Enddate);
                        aSelectedContexts.forEach(function (oSelectedContext) {
                            var sObjectPath = oSelectedContext.getPath();
                            oModel.setProperty(sObjectPath + "/RequiredEndDate", oData.Enddate);
                            oModel.setProperty(sObjectPath + "/RequiredStartDate", oData.Startdate);
                        });


                    }
                    that._oBusyDialog.close();
                },
                error: function (oResponse) {
                    that._refreshAfterChange(oModel);
                    that._oDataServiceErrorHandling(oResponse);
                    that._oBusyDialog.close();
                }
            });

        },

        changeAssignmentWorkCenter: function (oEvent) {
            var table = sap.ui.getCore().byId("notificationChangeAssignmentWorkCenterField-input-valueHelpDialog-table");
            if (table.getSelectedIndices && table.getSelectedIndices().length > 0 && table.getContextByIndex) {
                var sPlant = table.getContextByIndex(table.getSelectedIndices()[0]).getObject().Plant;

                var sPath = sap.ui.getCore().byId("notificationChangeAssignmentWorkCenterField").getBindingContext().sPath;
                this.getView().getModel().setProperty(sPath + "/MainWorkCenterPlant", sPlant);

            }

        },

        readPriorityRequiredDates2: function (sPriority, sMaintPriorityType) {
            var oUrlParam = {};

            var that = this;
            var aSelectedContexts = this.extensionAPI.getSelectedContexts();
            var oModel = this.getView().getModel();
            var iCount = aSelectedContexts.length;
            if (iCount < 0) {
                return;
            }
            var iCountLocal = 0;
            var oErg = {};
            aSelectedContexts.forEach(function (oSelectedContext) {
                if (!oSelectedContext.getObject().MaintPriority || oSelectedContext.getObject().MaintPriority !== "") {
                    return;
                }
                oUrlParam.MaintPriority = oSelectedContext.getObject().MaintPriority;
                oUrlParam.MaintPriorityType = oSelectedContext.getObject().MaintPriorityType;
                oModel.callFunction("/GetRequiredDates", {
                    method: "POST",
                    urlParameters: oUrlParam,
                    success: function (oData, test) {
                        if (oData) {
                            iCountLocal++;
                            oErg[iCountLocal] = test;
                            if (iCountLocal === iCount) {
                                that._refreshAfterChange(oModel);
                                sap.m.MessageBox.success(
                                    "Erfolg", {
                                    details: oErg
                                }
                                );
                            }

                        }
                    },
                    error: function (oResponse) {
                        iCountLocal++;
                        if (iCountLocal === iCount) {
                            that._refreshAfterChange(oModel);
                        }
                        that._oDataServiceErrorHandling(oResponse);
                    }
                });
            });
        },

        onAssignOrderPressed: function () {
            var oModel = this.getView().getModel(),
                oI18nModel = this.getView().getModel("@i18n"),
                oContexts = this.extensionAPI.getSelectedContexts();

            var oDialog = sap.ui.xmlfragment("zi2d.eam.orderandoperation.monitors1.ext.fragments.AssignOrderDialog", jQuery.extend({}, this, {
                afterDialogClosed: function () {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                onCancelPressed: function () {
                    oDialog.close();
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                onOkPressed: function () {
                    var oWorkCenter = sap.ui.getCore().byId("AssignWorkCenterField").getValue();
                    var oWorkCenterPlant = sap.ui.getCore().byId("AssignWorkCenterPlantField").getValue();
                    var that = this;

                    if (!oWorkCenter || !oWorkCenterPlant || oWorkCenter === "" || oWorkCenterPlant === "") {
                        return;
                    } else {

                        oDialog.close();
                        that._CallFunction("/ChangeAssgignment", "POST", {
                            "MainWorkCenter": oWorkCenter,
                            "MainWorkCenterPlant": oWorkCenterPlant
                        });
                    }
                }
            }));

            oContexts.sort(); //sort to ensure that the notification with the smallest ID always be assigned to the order's header level

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            oDialog.setModel(oModel);
            oDialog.setBindingContext(oContexts[0]);
            this.getView().addDependent(oDialog);

            oDialog.open();
        },

        onCreateTimeConfirmation: function () {
            var oModel = this.getView().getModel(),
                oi18n = this.getView().getModel("@i18n").getResourceBundle(),
                oContexts = this.extensionAPI.getSelectedContexts();

            var that = this;

            var oDialog = sap.ui.xmlfragment("zi2d.eam.orderandoperation.monitors1.ext.fragments.TimeConfirmationDialog", jQuery.extend({}, this, {
                afterDialogOpen: function () {
                    var oPersonalnummerField = sap.ui.getCore().byId("PersonalnummerField");
                    if (oPersonalnummerField) {
                        oPersonalnummerField.getParent().setLabel(oi18n.getText("persnr"));
                    }

                    var oPostingdateField = sap.ui.getCore().byId("PostingdateField");
                    if (oPostingdateField) {
                        oPostingdateField.getParent().setLabel(oi18n.getText("postingdate"));
                        var Today = new Date();
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
                        oPostingdateField.setValue(dateFormat.format(Today));
                    }
                },
                afterDialogClosed: function () {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                cancelTimeConfirmation: function () {
                    oDialog.close();
                    that.getView().getModel("viewModel").setProperty("/PersonnelNumber", "00000000");
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                createTimeConfirmation: function () {
                    var oActualworkquantityField = sap.ui.getCore().byId("ActualworkquantityField");
                    var sActualworkquantity = oActualworkquantityField.getValue();
                    sActualworkquantity = sActualworkquantity.replace(",", ".");
                    var sActualworkquantityunit = sap.ui.getCore().byId("ActualworkquantityField-sfEdit-comboBoxEdit").getSelectedKey();
                    if (sActualworkquantity <= 0) {
                        oActualworkquantityField.setValueState(sap.ui.core.ValueState.Error);
                        return;
                    } else {
                        oActualworkquantityField.setValueState(sap.ui.core.ValueState.None);
                    }
                    
                    var sIsfinalconfirmation = sap.ui.getCore().byId("IsfinalconfirmationField").getValue();
                    var sPersonnelnumber = sap.ui.getCore().byId("PersonalnummerField").getValue();
                    var sPostingdate = sap.ui.getCore().byId("PostingdateField").getValue();
                    var dPostingdate = new Date();
                    dPostingdate.setFullYear(sPostingdate.substr(6, 4), sPostingdate.substr(3, 2), sPostingdate.substr(0, 2));
                    dPostingdate.setMonth(dPostingdate.getMonth() - 1);


                    // if (!oWorkCenter || !oWorkCenterPlant || oWorkCenter === "" || oWorkCenterPlant === "") {
                    //     return;
                    // } else {

                    oDialog.close();
                    that.getView().getModel("viewModel").setProperty("/PersonnelNumber", "00000000");
                    that._CallFunction("/CreateTimeConfirmation", "POST", {
                        "Actualworkquantity": sActualworkquantity,
                        "Actualworkquantityunit": sActualworkquantityunit,
                        "Isfinalconfirmation": sIsfinalconfirmation,
                        "Personnelnumber": sPersonnelnumber,
                        "Postingdate": dPostingdate
                    });
                    // }
                }
            }));

            oContexts.sort(); //sort to ensure that the notification with the smallest ID always be assigned to the order's header level

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
            oDialog.setModel(oModel);
            oDialog.setBindingContext(oContexts[0]);
            this.getView().addDependent(oDialog);

            oDialog.open();
        },

        _CallFunction: function (sPath, sMethod, oUrlParam) {
            var that = this;
            var aSelectedContexts = this.extensionAPI.getSelectedContexts();
            var oModel = this.getView().getModel();
            var iCount = aSelectedContexts.length;
            if (iCount < 0) {
                return;
            }
            var iCountLocal = 0;
            var oErg = {};
            that._oBusyDialog.open();
            var oi18n = that.getView().getModel("@i18n").getResourceBundle();
            aSelectedContexts.forEach(function (oSelectedContext) {
                oUrlParam.MaintenanceOrder = oSelectedContext.getObject().MaintenanceOrder;
                oUrlParam.MaintenanceOrderOperation = oSelectedContext.getObject().MaintenanceOrderOperation;
                if (sPath === "/ChangeAssgignment") {
                    oUrlParam.MaintenanceOrderSubOperation = oSelectedContext.getObject().MaintenanceOrderSubOperation;
                }

                oModel.callFunction(sPath, {
                    method: sMethod,
                    urlParameters: oUrlParam,
                    success: function (oData, test) {
                        if (oData) {
                            iCountLocal++;
                            oErg[iCountLocal] = test;
                            if (iCountLocal === iCount) {
                                that._refreshAfterChange(oModel);
                                MessageToast.show(oi18n.getText("saved", oUrlParam.MaintenanceOrder));
                                // sap.m.MessageBox.success(
                                //     "Erfolg", {
                                //         details: oErg
                                //     }
                                // );
                            }

                        }
                        that._oBusyDialog.close();
                    },
                    error: function (oResponse) {
                        iCountLocal++;
                        if (iCountLocal === iCount) {
                            that._refreshAfterChange(oModel);
                        }
                        that._oDataServiceErrorHandling(oResponse);
                        that._oBusyDialog.close();
                    }
                });
            });

        },

        _oDataServiceErrorHandling: function (oResponse) {

            var sMessage = oResponse.message;
            var sDetails = oResponse.responseText;
            try {
                var msg = JSON.parse(oResponse.responseText);
                sMessage = msg.error.message.value;
                sap.m.MessageBox.error(
                    sMessage
                );
            } catch (err) {
                sap.m.MessageBox.error(
                    sMessage, {
                    details: sDetails
                }
                );
            }

        },

        _refreshAfterChange: function (oModel) {
            oModel.refresh(true);
            this.byId("listReport").getTable().removeSelections();
        },

        _functionImportCallback: function (sActionPath, oModel, oSelectedContexts, oOrder, oExtensionAPI) {
            return function () {
                var oUrlParams = {};
                if (oOrder !== "") {
                    oUrlParams.MaintenanceOrder = oOrder;
                }
                return oExtensionAPI.invokeActions(sActionPath, oSelectedContexts, oUrlParams);
            };
        },

        onValueHelpPersonnelnumber: function () {
            if (this._oValueHelpPersonnelnumber) {
                this._oValueHelpPersonnelnumber.destroy();
            }
            this._oValueHelpPersonnelnumber = sap.ui.xmlfragment(
                "zi2d.eam.orderandoperation.monitors1.ext.fragments.ValueHelpPersonnelnumber",
                this
            );
            this.getView().addDependent(this._oValueHelpPersonnelnumber);

            this._oValueHelpPersonnelnumber.open();
        },

        onChoosePersonnelnumber: function (oEvent) {
            var sPernr = "00000000";
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        sPernr = aSelectedCells[0].getText();
                    }
                }
            }
            this.onCancelValueHelpPersonnelnumber(this);
            this.getView().getModel("viewModel").setProperty("/PersonnelNumber", sPernr);

        },

        onExitValueHelpPersonnelnumber: function () {
            this._oValueHelpPersonnelnumber.destroy();
        },

        onCancelValueHelpPersonnelnumber: function () {
            if (this._oValueHelpPersonnelnumber && this._oValueHelpPersonnelnumber.isOpen()) {
                this._oValueHelpPersonnelnumber.close();
            }
        },

        onScanned: function (oEvent) {
            var oFilter = sap.ui.getCore().byId("zi2d.eam.orderandoperation.monitors1::sap.suite.ui.generic.template.ListReport.view.ListReport::ZC_ObjPgMaintOrderAndOperation--listReportFilter-filterItemControl_BASIC-TechnicalObjectLabel");
            if (oFilter) {
                var aTokens = oFilter.getTokens();
                if (!aTokens) {
                    aTokens = [];
                }
                aTokens.push(new sap.m.Token({
                    key: oEvent.getParameter('value'),
                    text: oEvent.getParameter('value')
                }));
                oFilter.setTokens(aTokens);
            }

        },

        onScan: function () {
            this.oScanner.open();
        },

        getDecoders: function () {
            return [{
                key: 'PDF417-UII',
                text: 'PDF417-UII',
                decoder: this.parserPDF417UII,
            },
            {
                key: 'text',
                text: 'TEXT',
                decoder: this.parserText,
            },
            ];
        },

        parserText: function (oResult) {
            var sText = '';
            var iLength = oResult.text.length;
            for (var i = 0; i !== iLength; i++) {
                if (oResult.text.charCodeAt(i) < 32) {
                    sText += ' ';
                } else {
                    sText += oResult.text[i];
                }
            }
            return sText;
        },

        parserPDF417UII: function (oResult) {
            // we expect that
            // first symbol of UII (S - ASCII = 83) or it just last group
            var sText = oResult.text || '';
            if (oResult.format && oResult.format === 10) {
                sText = '';
                var iLength = oResult.text.length;
                var aChars = [];
                for (var i = 0; i !== iLength; i++) {
                    aChars.push(oResult.text.charCodeAt(i));
                }
                var iStart = -1;
                var iGRCounter = 0;
                var iGroupUII = -1;
                var sTemp = '';
                aChars.forEach(function (code, k) {
                    switch (code) {
                        case 30:
                            if (iStart === -1) {
                                iStart = k;
                                sTemp = '';
                            } else {
                                sText = sTemp;
                                iGRCounter = -1;
                            }
                            break;
                        case 29:
                            iGRCounter += 1;
                            break;
                        default:
                            if (iGRCounter > 2 && code === 83 && iGRCounter > iGroupUII) {
                                sTemp = '';
                                iGroupUII = iGRCounter;
                            }
                            if (iGroupUII === iGRCounter) {
                                sTemp += String.fromCharCode(code);
                            }
                    }
                });
                if (sText) {
                    sText = sText.slice(1);
                }
            }
            return sText;
        }

    });
});