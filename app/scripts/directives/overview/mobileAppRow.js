'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileAppRow', {
    controller: [
      '$filter',
      '$routeParams',
      'ProjectsService',
      'DataService',
      'APIService',
      'ListRowUtils',
      MobileAppRow
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      state: '<',
      bindings: '<'
    },
    templateUrl: 'views/overview/_mobile-app-row.html'
  });

  function MobileAppRow($filter, $routeParams, ProjectsService, DataService, APIService, ListRowUtils) {
    var row = this;
    var $scope = {};
    $scope.secretsVersion = APIService.getPreferredVersion('secrets');

    const INTEGRATION_KEYCLOAK = 'keycloak';
    const INTEGRATION_FH_SYNC_SERVER = 'fh-sync-server';

    _.extend(row, ListRowUtils.ui);

    switch (row.apiObject.data.clientType) {
      case 'android':
        row.icon = 'fa fa-android';
        break;
      case 'iOS':
        row.icon = 'fa fa-apple';
        break;
      case 'cordova':
        row.icon = 'icon icon-cordova';
        break;
      default:
        row.icon = 'fa fa-clone';
    }

     ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;

        DataService.list($scope.secretsVersion, context, { errorNotification: false }).then(
          function(secrets) {
            $scope.unfilteredSecrets = _.sortBy(secrets.by("metadata.name"), ["type", "metadata.name"]);
            var mobileServices = _.filter($scope.unfilteredSecrets, function(secret) {
              return [INTEGRATION_KEYCLOAK, INTEGRATION_FH_SYNC_SERVER].indexOf(secret.metadata.name) > -1;
            });

            var sdkConfig = {
            };
            mobileServices.forEach(function(mobileService) {
              sdkConfig[mobileService.metadata.name] = {
                config: {
                  headers: {},
                  name: atob(mobileService.data.name).trim()
                }
              };
              if (mobileService.metadata.name === INTEGRATION_KEYCLOAK) {
                sdkConfig[mobileService.metadata.name].config = JSON.parse(atob(mobileService.data.public_installation).trim());
              } else if (mobileService.metadata.name === INTEGRATION_FH_SYNC_SERVER) {
                sdkConfig[mobileService.metadata.name].config = {
                  uri: atob(mobileService.data.uri).trim()
                };
                // TODO: 3scale/apicast
              }
            });
            row.sdkConfig = JSON.stringify(sdkConfig, true, 2);
          },
          function(e) {
            return alert(e);
          });
    }));
  }
})();
