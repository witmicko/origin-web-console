'use strict';

angular.module('openshiftConsole').component('serviceInstanceBindings', {
  controller: [
    '$filter',
    '$routeParams',
    '$scope',
    'ProjectsService',
    'APIService',
    'BindingService',
    'DataService',
    ServiceInstanceBindings
  ],
  controllerAs: '$ctrl',
  bindings: {
    isOverview: '<?',
    showHeader: '<?',
    project: '<',
    bindings: '<',
    serviceInstance: '<',
    serviceClass: '<',
    servicePlan: '<'
  },
  templateUrl: 'views/directives/service-instance-bindings.html'
});


function ServiceInstanceBindings($filter,
                                 $routeParams,
                                 $scope,
                                 ProjectsService,
                                 APIService,
                                 BindingService,
                                 DataService) {
  var ctrl = this;
  var canI = $filter('canI');
  var serviceBindingsVersion = ctrl.serviceBindingsVersion = APIService.getPreferredVersion('servicebindings');

  var checkBindable = function() {
    ctrl.bindable = canI(serviceBindingsVersion, 'create') &&
                    BindingService.isServiceBindable(ctrl.serviceInstance,
                                                     ctrl.serviceClass,
                                                     ctrl.servicePlan);
  };

  ctrl.createBinding = function() {
    ctrl.overlayPanelVisible = true;
  };
  
  $scope.secretsVersion = APIService.getPreferredVersion('secrets');

  var convertSecretToMobileService = function(svc) {
    return svc;
  };

  var readSecrets = function(secret_name1, secret_name2, cb) {    
    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;

        DataService.list($scope.secretsVersion, context, { errorNotification: false }).then(
          function(secrets) {
            $scope.unfilteredSecrets = _.sortBy(secrets.by("metadata.name"), ["type", "metadata.name"]);
            var secret1 = _.find($scope.unfilteredSecrets, {
              metadata: {
                name: secret_name1
              }
            });
            var secret2 = _.find($scope.unfilteredSecrets, {
              metadata: {
                name: secret_name2
              }
            })
            return cb(null, convertSecretToMobileService(secret1), convertSecretToMobileService(secret2));
          },
          function(e) {
            $scope.loaded = true;
            $scope.alerts["load"] = {
              type: "error",
              message: "Secret details could not be loaded.",
              details: $filter('getErrorDetails')(e)
            };
            return cb(e);
          });
    }));
  };

  var buildBindParams = function(from, to) {
    var params = {};
    params.credentials = {
      route: atob(from.data.uri), // Host
      service_secret: to.metadata.name // ID
    };

    // TODO copy over arbitrary params

    // TODO 3scale
    if (atob(from.data.name).trim() === 'keycloak') {
      params.service_name = atob(to.data.name).trim(); // Name
    }

    return params;
  };

  var bindToService = function(bindableService, targetSvcName, params, bindableSvcNamespace, targetSvcNamespace) {
    // TODO
    debugger
  };

  var updateEnabledIntegrations = function(targetMobileServiceID, integrationParams) {
    // TODO
  };

  var bindMobileServices = function(targetMobileServiceID, bindableMobileServiceID) {
    // read secrets that represent services
    readSecrets(bindableMobileServiceID, targetMobileServiceID, function(err, mobileService, targetService) {
      if (err) return alert(err);

      // TODO: namespaces for services
      var targetSvcNamespace = targetService.metadata.namespace;
      var bindableSvcNamespace = mobileService.metadata.namespace;

      // TODO: setup bind params
      var bindParams = buildBindParams(mobileService, targetService);

      // TODO: APIKeys
      // TODO: bind services
      bindToService(atob(mobileService.data.name).trim(), atob(targetService.data.name).trim(), bindParams, bindableSvcNamespace, targetSvcNamespace);

      // TODO: update 'enabled' integrations on secret
      var integrationParams = {};
      integrationParams[atob(mobileService.data.name).trim()] = true;
      updateEnabledIntegrations(targetMobileServiceID, integrationParams);
    });
  };

  ctrl.createBindingFromKeycloakToFHSyncServer = function() {
    var bindableMobileServiceID = 'keycloak';
    var targetMobileServiceID = 'fh-sync-server';
    bindMobileServices(targetMobileServiceID, bindableMobileServiceID);
  }

  ctrl.closeOverlayPanel = function() {
    ctrl.overlayPanelVisible = false;
  };

  ctrl.$onChanges = function() {
    checkBindable();
  };
}
