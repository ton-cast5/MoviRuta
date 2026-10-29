package com.moviruta.app.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.CarCrash
import androidx.compose.material.icons.outlined.CarRepair
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.DirectionsBus
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Sensors
import androidx.compose.ui.graphics.vector.ImageVector

/** Ícono nativo equivalente al nombre de Material Symbols que usa el menú de la página. */
fun iconoDe(nombre: String): ImageVector = when (nombre) {
    "dashboard", "space_dashboard" -> Icons.Outlined.Dashboard
    "history" -> Icons.Outlined.History
    "search" -> Icons.Outlined.Search
    "route" -> Icons.Outlined.Route
    "location_on" -> Icons.Outlined.LocationOn
    "map" -> Icons.Outlined.Map
    "badge", "id_card" -> Icons.Outlined.Badge
    "play_circle" -> Icons.Outlined.PlayCircle
    "directions_bus" -> Icons.Outlined.DirectionsBus
    "car_repair" -> Icons.Outlined.CarRepair
    "sensors" -> Icons.Outlined.Sensors
    "car_crash" -> Icons.Outlined.CarCrash
    "hub" -> Icons.Outlined.Hub
    "group" -> Icons.Outlined.Group
    else -> Icons.AutoMirrored.Outlined.KeyboardArrowRight
}
