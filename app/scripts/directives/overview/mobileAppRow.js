'use strict';

(function() {
  angular.module('openshiftConsole').component('mobileAppRow', {
    controller: [
      '$scope',
      '$filter',
      '$routeParams',
      'ProjectsService',
      'DataService',
      'APIService',
      'BuildsService',
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

  function MobileAppRow($scope, $filter, $routeParams, ProjectsService, DataService, APIService, BuildsService, ListRowUtils) {
    var row = this;
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

    $scope.projectName = $routeParams.project;
    $scope.alerts = {};
    $scope.renderOptions = $scope.renderOptions || {};
    $scope.renderOptions.hideFilterWidget = true;
    $scope.installType = '';

    const watches = [];
    const MOBILE_CI_CD_NAME = 'aerogear-digger';
    $scope.loading = true;
    $scope.dropdownActions = [
      {
        label: 'Edit',
        value: 'edit'
      }
    ];
    $scope.startBuild = function() {
      BuildsService.startBuild($scope.buildConfig).then(() => {
        $location.url(
          `project/${$routeParams.project}/browse/mobileapps/${$routeParams.mobileapp}?tab=buildHistory`
        );
      });
    };

    $scope.cancelEdit = function() {
      $scope.view = 'view';
    };

    var buildConfigForBuild = $filter('buildConfigForBuild');
    var filterBuilds = function(allBuilds) {
      $scope.builds = _.filter(allBuilds, build => {
        var buildConfigName = buildConfigForBuild(build) || '';
        return (
          $scope.buildConfig &&
          $scope.buildConfig.metadata.name === buildConfigName
        );
      });
      $scope.orderedBuilds = BuildsService.sortBuilds($scope.builds, true);
    };

    ProjectsService.get($routeParams.project)
      .then(function(projectInfo) {
        const [project = {}, projectContext = {}] = projectInfo;
        $scope.project = project;
        $scope.projectContext = projectContext;

        return Promise.all([
          DataService.list('buildconfigs', projectContext),
          DataService.list('builds', projectContext),
          DataService.list('secrets', projectContext)
        ]);
      })
      .then(viewData => {
        const [
          buildConfigs = {},
          builds = {},
          secrets = {}
        ] = viewData;

        var app = row.apiObject;

        const buildData = buildConfigs['_data'];
        $scope.buildConfig = Object.keys(buildData)
          .map(key => {
            return buildData[key];
          })
          .filter(buildConfig => {
            return (
              buildConfig.metadata.labels['mobile-appid'] ===
              app.metadata.name
            );
          })
          .pop();

        $scope.view = $scope.buildConfig ? 'view' : 'create';

        filterBuilds(builds['_data']);

        watches.push(
          DataService.watch('builds', $scope.projectContext, function(builds) {
            filterBuilds(builds['_data']);
          })
        );

        $scope.app = app;
        switch (app.data.clientType) {
          case 'cordova':
            $scope.installType = 'npm';
            break;
          case 'android':
            $scope.installType = 'maven';
            break;
          case 'iOS':
            $scope.installType = 'cocoapods';
            break;
        }

        // $scope.integrations = services;
        $scope.hasMobileCiCd = Object.keys(secrets['_data'])
          .map(key => secrets['_data'][key])
          .some(secret => {
            return (
              secret.metadata.name === MOBILE_CI_CD_NAME &&
              secret.metadata.namespace === $scope.project.metadata.name
            );
          });

        $scope.loading = false;
      });

    $scope.$on('$destroy', function() {
      DataService.unwatchAll(watches);
    });
  }
})();
