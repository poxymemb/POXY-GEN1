'use strict';
window.PoxyLegacyStyles=(function(){
  var SHEETS=["assets/frames.css","assets/poxy-identity.css?v=3","assets/poxy-quick-profile.css?v=6","assets/poxy-ranks-page.css?v=8","assets/poxy-rarity-page.css?v=5","assets/poxy-club-page.css?v=2","assets/poxy-club-gold.css?v=2","assets/poxy-market-page.css?v=6","assets/poxy-store-page.css?v=2","assets/poxy-explore-page.css?v=4","assets/poxy-gens-page.css?v=4","assets/poxy-profile-page.css?v=7","assets/poxy-collection-page.css?v=21","assets/poxy-friends-page.css?v=3","assets/poxy-news-page.css?v=4","assets/poxy-settings-page.css?v=7","assets/poxy-notify-hub.css?v=3","assets/poxy-support-panel.css?v=5","assets/poxy-chat-social.css?v=1","assets/lumina-chat-os.css?v=15","assets/lumina-os/design-system.css?v=15","assets/lumina-features.css?v=1","assets/poxy-topup-modal.css?v=1","assets/poxy-card-engine.css?v=6","assets/poxy-asset-viewer.css?v=13","assets/poxy-dna-traits.css?v=1","assets/poxy-lore.css?v=1","assets/poxy-passport-extras.css?v=1","assets/poxy-discovery-feed.css?v=1","assets/poxy-season-atlas.css?v=1","assets/poxy-museum-mode.css?v=1","assets/poxy-milestones.css?v=1","assets/poxy-certificate.css?v=1","assets/poxy-share-preview.css?v=1","assets/poxy-crypto-docs.css?v=1","assets/poxy-news-lumina.css?v=3","assets/poxy-telemetry.css?v=4","assets/poxy-whitepaper.css?v=6","assets/poxy-verify-terminal.css?v=12","assets/poxy-onboarding.css?v=2","assets/poxy-sky/legacy-app-inline.css?v=1"];
  var AUTH_SHEETS = [];
  var ICONS='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
  var mounted=false;
  var authMounted=false;
  function link(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.poxyLegacy='1';document.head.appendChild(l);return l;}
  return {
    mountAuth:function(){
      if(authMounted)return;
      AUTH_SHEETS.forEach(link);
      link(ICONS);
      authMounted=true;
    },
    mount:function(){
      if(mounted)return;
      this.mountAuth();
      SHEETS.forEach(link);
      mounted=true;
    },
    unmount:function(){
      document.querySelectorAll('link[data-poxy-legacy]').forEach(function(n){n.remove();});
      mounted=false;
      authMounted=false;
    },
    isMounted:function(){return mounted;}
  };
})();
