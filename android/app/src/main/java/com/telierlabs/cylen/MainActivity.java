package com.telierlabs.cylen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.firebaseauthentication.FirebaseAuthenticationPlugin;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(FirebaseAuthenticationPlugin.class);
  }
}
