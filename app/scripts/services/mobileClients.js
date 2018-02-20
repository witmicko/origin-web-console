'use strict';

angular.module("openshiftConsole")
  .factory("MobileClientsService", function(DataService) {

    var mobileclientVersion = {
      group: "mobile.k8s.io",
      version: "v1alpha1",
      resource: "mobileclients"
    };


    var watch = function(context, callback, opts ) {
      return DataService.watch(mobileclientVersion, context, callback, opts);
    };

    var getMobileClients = function(namespace) {
      return DataService.list(mobileclientVersion, {namespace: namespace})
        .then(function(clients) {
          return clients.by("metadata.name");
        });
    };


    var filterExcluded = function(serviceName, mobileClients) {
      return _.filter(mobileClients, function(client) {
        return _.includes(client.spec.excludedServices, serviceName);
      });
    };


    var removeFromExcluded = function(mobileClient, serviceName, context) {
      _.remove(mobileClient.spec.excludedServices, function(service) {
        return service === serviceName;
      });
      return DataService.update(mobileclientVersion, mobileClient.metadata.name, mobileClient, context);
    };


    return {
      watch: watch,
      filterExcluded: filterExcluded,
      getMobileClients: getMobileClients,
      removeFromExcluded: removeFromExcluded
    };
  });


