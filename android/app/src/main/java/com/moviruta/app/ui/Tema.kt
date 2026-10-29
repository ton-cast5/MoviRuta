package com.moviruta.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Mismos colores Material 3 que la página web (assets/js/tailwind-config.js). */
private val Esquema = lightColorScheme(
    primary = Color(0xFF004532),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFF065F46),
    onPrimaryContainer = Color(0xFF8BD6B7),
    inversePrimary = Color(0xFF8BD6B6),
    secondary = Color(0xFF006C49),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFF6CF8BB),
    onSecondaryContainer = Color(0xFF00714D),
    tertiary = Color(0xFF00462F),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFF006042),
    onTertiaryContainer = Color(0xFF69DDAA),
    background = Color(0xFFF7F9FB),
    onBackground = Color(0xFF191C1E),
    surface = Color(0xFFF7F9FB),
    onSurface = Color(0xFF191C1E),
    surfaceVariant = Color(0xFFE0E3E5),
    onSurfaceVariant = Color(0xFF3F4944),
    surfaceTint = Color(0xFF1B6B51),
    inverseSurface = Color(0xFF2D3133),
    inverseOnSurface = Color(0xFFEFF1F3),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF93000A),
    outline = Color(0xFF6F7973),
    outlineVariant = Color(0xFFBEC9C2),
    surfaceBright = Color(0xFFF7F9FB),
    surfaceDim = Color(0xFFD8DADC),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF2F4F6),
    surfaceContainer = Color(0xFFECEEF0),
    surfaceContainerHigh = Color(0xFFE6E8EA),
    surfaceContainerHighest = Color(0xFFE0E3E5),
)

@Composable
fun TemaMoviRuta(contenido: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Esquema, content = contenido)
}
