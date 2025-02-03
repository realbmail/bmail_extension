//
//  Item.swift
//  bmail
//
//  Created by wesley on 2025/2/3.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
