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
  ctrl.mobileIntegrations = {};

  var canI = $filter('canI');
  var serviceBindingsVersion = ctrl.serviceBindingsVersion = APIService.getPreferredVersion('servicebindings');

  const INTEGRATION_API_KEYS = 'mcp-mobile-keys';
  const INTEGRATION_KEYCLOAK = 'keycloak';
  const INTEGRATION_FH_SYNC_SERVER = 'fh-sync-server';

  var checkBindable = function() {
    ctrl.bindable = canI(serviceBindingsVersion, 'create') &&
                    BindingService.isServiceBindable(ctrl.serviceInstance,
                                                     ctrl.serviceClass,
                                                     ctrl.servicePlan);
  };

  var checkIsFHSyncServer = function() {
    ctrl.isFHSyncServer = ctrl.serviceClass && (ctrl.serviceClass.spec.externalMetadata.serviceName === INTEGRATION_FH_SYNC_SERVER);
  };

  var checkIsMobileIntegrationEnabled = function() {
    if (ctrl.isFHSyncServer) {
      ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;

        DataService.get($scope.secretsVersion, INTEGRATION_FH_SYNC_SERVER, context, { errorNotification: false }).then(
          function(secret) {
            try {
              ctrl.mobileIntegrations[INTEGRATION_API_KEYS] = JSON.parse(secret.metadata.labels[INTEGRATION_API_KEYS]);
            } catch (e) {
              ctrl.mobileIntegrations[INTEGRATION_API_KEYS] = false;
            }

            try {
              ctrl.mobileIntegrations[INTEGRATION_KEYCLOAK] = JSON.parse(secret.metadata.labels[INTEGRATION_KEYCLOAK]);
            } catch (e) {
              ctrl.mobileIntegrations[INTEGRATION_KEYCLOAK] = false;
            }
          },
          function(e) {
            return alert('Unable to read secret ' + INTEGRATION_FH_SYNC_SERVER + e);
          });
      }));
    }
  };

  ctrl.createBinding = function() {
    ctrl.overlayPanelVisible = true;
  };
  
  $scope.secretsVersion = APIService.getPreferredVersion('secrets');
  $scope.bindingResource = APIService.getPreferredVersion('servicebindings');
  $scope.deploymentResource = APIService.getPreferredVersion('deployments');
  // $scope.podPresetResource = APIService.getPreferredVersion('podpreset');
  $scope.podPresetResource = {
    group:"settings.k8s.io",
    resource:"podpresets",
    version:"v1alpha1"
  };

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

    // copy over arbitrary secret keys as params
    for(var key in from.data) {
      if (['uri', 'name'].indexOf(key) < 0) {
        params[key] = atob(from.data[key]).trim();
      }
    }

    // TODO 3scale
    if (atob(from.data.name).trim() === INTEGRATION_KEYCLOAK) {
      params.service_name = atob(to.data.name).trim(); // Name
    }

    return params;
  };

  var serviceClassByServiceName = function(name, cb) {
    var serviceClassesVersion = APIService.getPreferredVersion('clusterserviceclasses');
    DataService.list(serviceClassesVersion, {}).then(function(serviceClasses) {
      var serviceClass = _.find(serviceClasses.by('metadata.name'), {
        spec: {
          externalMetadata: {
            serviceName: name
          }
        }
      });
      if (!serviceClass) {
        return cb("failed to find service class for service " + name)
      }
      return cb(null, serviceClass);
    });
  };

  var serviceInstancesForServiceClass = function(serviceClass, ns, cb) {
    ProjectsService
    .get($routeParams.project)
    .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;
        var serviceInstanceVersion = APIService.getPreferredVersion('serviceinstances');
        DataService.list(serviceInstanceVersion, context).then(function(serviceInstances) {
          $scope.unfilteredServiceInstances = serviceInstances.by('metadata.name');
          var matchingServiceInstances = _.filter($scope.unfilteredServiceInstances, {
            spec: {
              clusterServiceClassExternalName: serviceClass
            }
          });
          return cb(null, matchingServiceInstances);
        });
    }));
  };

  var createBindingObject = function(instance, params, secretName) {
    return {
      "kind": "ServiceBinding",
      "apiVersion": "servicecatalog.k8s.io/v1beta1",
      "metadata":{
        "generateName": instance + '-'
      },
      "spec": {
        "instanceRef":{
          "name": instance
        },
        "secretName": secretName,
        "parameters": params
      }
    };
  };

  var podPreset = function(objectName, secretName, svcName, targetSvcName, namespace, cb) {
    var newPodPreset = {
      "kind": "PodPreset",
      "apiVersion": "settings.k8s.io/v1alpha1",
      metadata: {
        name: objectName,
        labels: {
          "group":   "mobile",
          "service": svcName,
        }
      },
      spec: {
        selector: {
          matchLabels: {
            "run":   targetSvcName
          }
        },
        volumes: [{
          name: svcName,
          secret: {
            secretName: secretName,
          }
        }],
        volumeMounts: [{
          name:      svcName,
          mountPath: "/etc/secrets/" + svcName,
        }]
      }
    };
    newPodPreset.spec.selector.matchLabels[svcName] = "enabled";

    // TODO: better error handling
    DataService.create($scope.podPresetResource, null, newPodPreset, $scope.context).then(function(preset) {
      if (!preset) return cb('Pod Preset not created');
      return cb(null, preset);
    });
  };

  var bindToService = function(bindableService, targetSvcName, params, bindableSvcNamespace, targetSvcNamespace, cb) {
    var objectName = bindableService + "-" + targetSvcName;

    serviceClassByServiceName(bindableService, function(err, bindableServiceClass) {
      if (err) return cb(err);
      serviceInstancesForServiceClass(bindableServiceClass.spec.externalName, targetSvcNamespace, function(err, svcInstList) {
        if (err) return cb(err);
        if (svcInstList.length === 0) return cb("no service instance of " + bindableService + " found in ns " + targetSvcNamespace)

          // only care about the first one as there only should ever be one.
        	var svcInst = svcInstList[0];
          var newBinding = createBindingObject(svcInst.metadata.name, params, objectName)

          // create binding
          //BindingService.bindService(svcInst, null, bindableServiceClass, params).then(function(binding){
          DataService.create($scope.bindingResource, null, newBinding, $scope.context).then(function(binding) {
            // create pod preset
            podPreset(objectName, objectName, bindableService, targetSvcName, targetSvcNamespace, function(err) {
              if (err) return cb(err);
              // update the deployment with an annotation
              DataService.get($scope.deploymentResource, targetSvcName, $scope.context, { errorNotification: false }).then(
                function(dep) {
                  dep.spec.template.metadata.labels[bindableService] = 'enabled';
                  dep.spec.template.metadata.labels[bindableService+"-binding"] = binding.metadata.name;

                  DataService.update($scope.deploymentResource, targetSvcName, dep, $scope.context).then(
                    function() {
                      return cb(null);
                    },
                    function(e) {
                      return cb("failed to update deployment for "+targetSvcName + e);
                    }
                  );
                },
                function(e) {
                  return cb("failed to get deployment for service "+targetSvcName + e);
                }
              );
            });
          });
      });
    });
  };

  var updateEnabledIntegrations = function(svcName, integrations, cb) {
    DataService.get($scope.secretsVersion, svcName, $scope.context, { errorNotification: false }).then(
    function(secret) {
      secret.metadata.labels = secret.metadata.labels || {};

      for (var key in integrations) {
        secret.metadata.labels[key] = integrations[key];
      }

      DataService.update($scope.secretsVersion, svcName, secret, $scope.context).then(
        function() {
          return cb(null);
        },
        function(e) {
          return cb("failed up update secret "+svcName + e);
        }
      );
    },
    function(e) {
      return cb("failed to get secret  "+svcName + e);
    });
  };
  
  var addMobileApiKeys = function(targetSvcName, namespace, cb) {
	  var objectName = INTEGRATION_API_KEYS + "-" + targetSvcName;
    // create pod preset
    podPreset(objectName, INTEGRATION_API_KEYS, INTEGRATION_API_KEYS, targetSvcName, namespace, function(err) {
      if (err) return cb(err);
      // update the deployment with an annotation
      DataService.get($scope.deploymentResource, targetSvcName, $scope.context, { errorNotification: false }).then(
        function(dep) {
          dep.spec.template.metadata.labels[INTEGRATION_API_KEYS] = 'enabled';

          DataService.update($scope.deploymentResource, targetSvcName, dep, $scope.context).then(
            function() {
              return cb(null);
            },
            function(e) {
              return cb("failed to update deployment for "+targetSvcName + e);
            }
          );
        },
        function(e) {
          return cb("failed to get deployment for service "+targetSvcName + e);
        }
      );
    });
  };

  var bindMobileServices = function(targetMobileServiceID, bindableMobileServiceID) {
    // read secrets that represent services
    readSecrets(bindableMobileServiceID, targetMobileServiceID, function(err, mobileService, targetService) {
      if (err) return alert(err);

      // namespaces for services
      var targetSvcNamespace = targetService.metadata.namespace;
      var bindableSvcNamespace = mobileService.metadata.namespace;

      if (INTEGRATION_API_KEYS === atob(mobileService.data.name).trim()) {
        // api keys
        addMobileApiKeys(atob(targetService.data.name).trim(), targetSvcNamespace, function(err) {
          if (err) return alert(err);

          // TODO: de-dupe this code with below block
          // update 'enabled' integrations on secret
          var integrationParams = {};
          integrationParams[atob(mobileService.data.name).trim()] = "true";
          updateEnabledIntegrations(targetMobileServiceID, integrationParams, function(err) {
            if (err) return alert(err);
            // DONE
          });
        });
      } else {
        // setup bind params
        var bindParams = buildBindParams(mobileService, targetService);
        // bind services
        bindToService(atob(mobileService.data.name).trim(), atob(targetService.data.name).trim(), bindParams, bindableSvcNamespace, targetSvcNamespace, function(err) {
          if (err) return alert(err);

          // update 'enabled' integrations on secret
          var integrationParams = {};
          integrationParams[atob(mobileService.data.name).trim()] = "true";
          updateEnabledIntegrations(targetMobileServiceID, integrationParams, function(err) {
            if (err) return alert(err);
            // DONE
          });
        });
      }
    });
  };

  ctrl.enableBindingFromKeycloakToFHSyncServer = function() {
    var bindableMobileServiceID = INTEGRATION_KEYCLOAK;
    var targetMobileServiceID = INTEGRATION_FH_SYNC_SERVER;
    bindMobileServices(targetMobileServiceID, bindableMobileServiceID);
  }

  ctrl.enableBindingFromAPIKeysToFHSyncServer = function() {
    var bindableMobileServiceID = INTEGRATION_API_KEYS;
    var targetMobileServiceID = INTEGRATION_FH_SYNC_SERVER;
    bindMobileServices(targetMobileServiceID, bindableMobileServiceID);
  };
  
  ctrl.disableBindingFromKeycloakToFHSyncServer = function() {
    var bindableMobileServiceID = INTEGRATION_KEYCLOAK;
    var targetMobileServiceID = INTEGRATION_FH_SYNC_SERVER;
    // TODO
  }

  ctrl.disableBindingFromAPIKeysToFHSyncServer = function() {
    var bindableMobileServiceID = INTEGRATION_API_KEYS;
    var targetMobileServiceID = INTEGRATION_FH_SYNC_SERVER;
    // TODO
  };

  ctrl.closeOverlayPanel = function() {
    ctrl.overlayPanelVisible = false;
  };

  ctrl.$onChanges = function() {
    checkBindable();
    checkIsFHSyncServer();
    checkIsMobileIntegrationEnabled();
  };
}
