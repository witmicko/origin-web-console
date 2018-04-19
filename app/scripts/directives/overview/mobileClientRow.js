'use strict';

(function () {
  angular.module('openshiftConsole').component('mobileClientRow', {
    controller: [
      '$filter',
      '$routeParams',
      'APIService',
      'AuthorizationService',
      'DataService',
      'ListRowUtils',
      'Navigate',
      'ServiceInstancesService',
      MobileAppRow,
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      state: '<'
    },
    templateUrl: 'views/overview/_mobile-client-row.html'
  });

  function MobileAppRow($filter, $routeParams, APIService, AuthorizationService, DataService, ListRowUtils, Navigate, ServiceInstancesService) {
    var row = this;
    var serviceInstancesVersion = APIService.getPreferredVersion('serviceinstances');
    var isServiceInstanceReady = $filter('isServiceInstanceReady');
    var isMobileService = $filter('isMobileService');
    row.installType = '';

    _.extend(row, ListRowUtils.ui);

    row.$onInit = function() {
      var context = {namespace: _.get(row, 'apiObject.metadata.namespace')};
      DataService.watch(serviceInstancesVersion, context, function (serviceinstances){
        row.services = _.filter(serviceinstances.by('metadata.name'), function(serviceInstance){
          return ServiceInstancesService.fetchServiceClassForInstance(serviceInstance)
            .then(function (serviceClass){
              return isMobileService(serviceClass) && isServiceInstanceReady(serviceInstance);
            });
        });
      }, { errorNotification: false });
    };

    row.$onChanges = function(changes) {
      if (changes.apiObject) {
        row.bundleDisplay = row.apiObject.spec.appIdentifier;
        row.clientType = row.apiObject.spec.clientType.toUpperCase();
        switch (row.apiObject.spec.clientType) {
          case 'android':
            row.installType = 'gradle';
            break;
          case 'iOS':
            row.installType = 'cocoapods';
            break;
          case 'cordova':
            row.installType = 'npm';
            break;
        }
      }
    };


    row.mobileclientVersion = {
      group: "mobile.k8s.io",
      version: "v1alpha1",
      resource: "mobileclients"
    };
    row.actionsDropdownVisible = function () {
      // no actions on those marked for deletion
      if (_.get(row.apiObject, 'metadata.deletionTimestamp')) {
        return false;
      }

      // We can delete mobileclients
      return AuthorizationService.canI(row.mobileclientVersion, 'delete');
    };
    row.projectName = $routeParams.project;
    row.browseCatalog = function () {
      Navigate.toProjectCatalog(row.projectName);
    };
  }
})();
