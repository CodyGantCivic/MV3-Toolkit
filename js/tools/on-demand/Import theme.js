var copyOfOriginalDesignCenterThemeJSON = JSON.parse(JSON.stringify(DesignCenter.themeJSON));

function ToolkitParseUploadedTheme(themeJSON) {
  // Create a copy of the themeJSON passed in
  var themeJSONupload = JSON.parse(JSON.stringify(themeJSON));

  themeJSONupload.ThemeID = copyOfOriginalDesignCenterThemeJSON.ThemeID;
  themeJSONupload.StructureID = copyOfOriginalDesignCenterThemeJSON.StructureID;
  themeJSONupload.ModifiedBy = copyOfOriginalDesignCenterThemeJSON.ModifiedBy;
  themeJSONupload.WidgetSkins = copyOfOriginalDesignCenterThemeJSON.WidgetSkins;

  themeJSONupload.ModuleStyle.ModuleStyleID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ModuleStyleID;
  themeJSONupload.ModuleStyle.ThemeID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ThemeID;

  themeJSONupload.FileName = copyOfOriginalDesignCenterThemeJSON.FileName;
  themeJSONupload.ContentHash = copyOfOriginalDesignCenterThemeJSON.ContentHash;

  themeJSONupload.CreatedBy = copyOfOriginalDesignCenterThemeJSON.CreatedBy;
  themeJSONupload.CreatedOn = copyOfOriginalDesignCenterThemeJSON.CreatedOn;

  var newContainerStyles = [];

  // Need to keep in same order
  $.each(DesignCenter.themeJSON.ContainerStyles, function() {
    var nonUploadedContainerStyle = this;

    var thisExternalId = null;
    $.each(DesignCenter.structureJSON.ContentContainers, function() {
      if (nonUploadedContainerStyle.ContentContainerID == this.ContentContainerID) {
        thisExternalId = this.ExternalID;
      }
    });

    $.each(themeJSONupload.ContainerStyles, function() {
      if (this.ContentContainerID == thisExternalId) {
        this.ContentContainerID = nonUploadedContainerStyle.ContentContainerID;
        this.DefaultWidgetSkinID = 0;
        this.ThemeID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ThemeID;
        console.log(
          "Resetting widget skin ID on '" + this.ContentContainerID + "'. It was " + this.DefaultWidgetSkinID
        );

        newContainerStyles.push(this);
      }
    });
  });

  themeJSONupload.ContainerStyles = newContainerStyles;

  $.each(themeJSONupload.SiteStyles, function() {
    var uploadedSiteStyle = this;
    $.each(copyOfOriginalDesignCenterThemeJSON.SiteStyles, function() {
      if (this.Selector == uploadedSiteStyle.Selector) {
        uploadedSiteStyle.SiteStyleID = this.SiteStyleID;
        uploadedSiteStyle.ThemeID = this.ThemeID;
      }
    });
  });
  $.each(themeJSONupload.MenuStyles, function() {
    var uploadedSiteStyle = this;
    $.each(copyOfOriginalDesignCenterThemeJSON.MenuStyles, function() {
      if (this.Name == uploadedSiteStyle.Name) {
        uploadedSiteStyle.MenuStyleID = this.MenuStyleID;
        uploadedSiteStyle.ThemeID = this.ThemeID;
      }
    });
  });
  $.each(themeJSONupload.BannerOptions, function() {
    var uploadedSiteStyle = this;
    $.each(copyOfOriginalDesignCenterThemeJSON.BannerOptions, function() {
      if (this.SlotName == uploadedSiteStyle.SlotName) {
        uploadedSiteStyle.BannerOptionID = this.BannerOptionID;
        uploadedSiteStyle.BannerThemeID = this.BannerThemeID;
        uploadedSiteStyle.BannerImages = this.BannerImages;
        uploadedSiteStyle.BannerVideos = this.BannerVideos;
      }
    });
  });
  $.each(themeJSONupload.BannerStyles, function() {
    var uploadedSiteStyle = this;
    $.each(copyOfOriginalDesignCenterThemeJSON.BannerStyles, function() {
      if (this.SlotName == uploadedSiteStyle.SlotName) {
        uploadedSiteStyle.BannerStyleID = this.BannerStyleID;
        uploadedSiteStyle.ThemeID = this.ThemeID;
      }
    });
  });
  return themeJSONupload;
}

var shouldImportTheme_ts = confirm(
  "Importing a theme will override all styles associated with the current theme. You must manually upload the correct XML/CSS for this theme before importing."
);

if (shouldImportTheme_ts) {
  $("<input type='file' style='display: none;' id='toolkitThemeJSONUpload'>").appendTo("body");
  $("#toolkitThemeJSONUpload").change(function() {
    var file = this.files[0];
    var reader = new FileReader();
    reader.readAsText(file);

    reader.onloadend = function(e) {
      console.log("Loaded new theme JSON. Parsing...");
      var data = JSON.parse(e.target.result);
      var parsedThemeData = ToolkitParseUploadedTheme(data);
      console.log(parsedThemeData);

      DesignCenter.themeJSON = parsedThemeData;

      if (
        confirm(
          "Are you SURE that you want to override the current theme with the uploaded theme? Click OK to continue or Cancel to cancel."
        )
      ) {
        saveTheme(true);
        setTimeout(function() {
          saveThemeStyleSheet(true);
        }, 2000);
      }
    };
  });
  $("#toolkitThemeJSONUpload").click();
}
