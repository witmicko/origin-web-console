'use strict';


angular.module('openshiftConsole').component('mobileClientConfig', {
    bindings: {
      mobileClient: '<',
    },
    templateUrl: 'views/mobile-client-config.html',
    controller: [
      'API_CFG',
      'APIService',
      'DataService',
      'SecretsService',
      MobileClientConfigCtrl
    ]
  });

var getClientConfig = function(mobileClient, serviceConfig, clusterInfo) {
  return JSON.stringify({
    version: 1,
    clusterName: "https://" + clusterInfo.openshift.hostPort,
    namespace: _.get(mobileClient, 'metadata.namespace'),
    clientId: _.get(mobileClient, 'metadata.name'),
    services: serviceConfig
  }, null, '  ');
};

var getServiceConfig = function(services, SecretsService) {
  return _.map(services, function(service) {
    var decodedData = SecretsService.decodeSecretData(service.data);
    return {
      id: _.get(service, 'metadata.name'),
      name: _.get(decodedData, 'name'),
      type: decodedData.type,
      url: decodedData.uri,
      config: JSON.parse(decodedData.config)
    };
  });
};

function MobileClientConfigCtrl(API_CFG, APIService, DataService, SecretsService) {
  var ctrl = this;
  var watches = [];
  ctrl.$onInit = function() {
    var context = {namespace: _.get(ctrl, 'mobileClient.metadata.namespace')};

    watches.push(DataService.watch(APIService.getPreferredVersion('secrets'), context, updateClientSecret, {errorNotification: false}));
    function updateClientSecret(secrets) {
      ctrl.secrets = _.filter(secrets.by("metadata.name"), function(secret) {
        return _.get(secret, 'metadata.labels.clientId') === ctrl.mobileClient.metadata.name;
      });

      ctrl.serviceConfig = getServiceConfig(ctrl.secrets, SecretsService);
      ctrl.prettyConfig = getClientConfig(ctrl.mobileClient, ctrl.serviceConfig, API_CFG);
    }
  };

  ctrl.$onChanges = function(changes) {
    if (changes.mobileClient && ctrl.services) {
      ctrl.serviceConfig = getServiceConfig(ctrl.secrets, SecretsService);
      ctrl.prettyConfig = getClientConfig(ctrl.mobileClient, ctrl.serviceConfig, API_CFG);
    }
  };

  ctrl.$onDestroy = function() {
    DataService.unwatchAll(watches);
  };
}
